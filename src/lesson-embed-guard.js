/**
 * Front-end safe render guard for lesson iframe embeds.
 * Prevents empty pages by automatically falling back to an alternate URL
 * and finally rendering a recovery CTA when embed fails.
 */

const LOAD_TIMEOUT_MS = 10000;

export function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveLessonUrl(lesson) {
  const primary = lesson?.embedUrl;
  const fallback = lesson?.fallbackEmbedUrl;
  const external = lesson?.openInNewTabUrl || primary || fallback || null;

  if (isValidHttpUrl(primary)) {
    return { url: primary, source: 'primary', externalUrl: external };
  }

  if (isValidHttpUrl(fallback)) {
    return { url: fallback, source: 'fallback', externalUrl: external };
  }

  return { url: null, source: 'none', externalUrl: isValidHttpUrl(external) ? external : null };
}

export function renderLessonUnavailable(container, externalUrl) {
  container.innerHTML = `
    <div style="padding:16px;border:1px solid #f59e0b;border-radius:12px;background:#fffbeb;color:#78350f;">
      <h3 style="margin:0 0 8px 0;">ไม่สามารถแสดงบทเรียนในหน้านี้ได้</h3>
      <p style="margin:0 0 12px 0;">ระบบสลับโหมดความปลอดภัยแล้ว เพื่อไม่ให้หน้าว่างเปล่า</p>
      ${externalUrl ? `<a href="${externalUrl}" target="_blank" rel="noopener noreferrer">เปิดบทเรียนในแท็บใหม่</a>` : ''}
    </div>
  `;
}

export function safeRenderLesson(container, lesson, options = {}) {
  const { onStatus } = options;
  const first = resolveLessonUrl(lesson);

  if (!container) throw new Error('safeRenderLesson requires a container element.');

  if (!first.url) {
    renderLessonUnavailable(container, first.externalUrl);
    onStatus?.({ status: 'error', source: 'none' });
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.src = first.url;
  iframe.loading = 'lazy';
  iframe.style.width = '100%';
  iframe.style.minHeight = '560px';
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  container.replaceChildren(iframe);

  let settled = false;
  const timer = window.setTimeout(() => {
    if (settled) return;
    settled = true;

    if (first.source !== 'fallback' && isValidHttpUrl(lesson?.fallbackEmbedUrl)) {
      onStatus?.({ status: 'fallback-timeout', source: 'primary' });
      safeRenderLesson(container, { ...lesson, embedUrl: lesson.fallbackEmbedUrl, fallbackEmbedUrl: null }, options);
      return;
    }

    renderLessonUnavailable(container, first.externalUrl);
    onStatus?.({ status: 'error-timeout', source: first.source });
  }, LOAD_TIMEOUT_MS);

  iframe.addEventListener('load', () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    onStatus?.({ status: 'loaded', source: first.source });
  });

  iframe.addEventListener('error', () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);

    if (first.source !== 'fallback' && isValidHttpUrl(lesson?.fallbackEmbedUrl)) {
      onStatus?.({ status: 'fallback-error', source: 'primary' });
      safeRenderLesson(container, { ...lesson, embedUrl: lesson.fallbackEmbedUrl, fallbackEmbedUrl: null }, options);
      return;
    }

    renderLessonUnavailable(container, first.externalUrl);
    onStatus?.({ status: 'error', source: first.source });
  });
}
