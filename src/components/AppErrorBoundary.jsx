import React from "react";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

const IS_DEV = import.meta.env.DEV;

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error || ""),
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application error boundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="brand-shell flex min-h-screen items-center justify-center px-4 py-10">
        <section className="brand-panel-strong max-w-2xl p-8 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-warm">
            <AlertTriangle size={24} />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.24em] text-white/55">System Recovery</p>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            ระบบขัดข้องชั่วคราว แต่เรายังพากลับเข้าสู่เส้นทางหลักได้
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/72 md:text-base">
            หน้าเว็บส่วนนี้เกิดข้อผิดพลาดระหว่างการโหลด คุณสามารถรีเฟรชอีกครั้งหรือกลับไปหน้าแรกเพื่อเริ่มใหม่ได้ทันที
          </p>

          {IS_DEV && this.state.errorMessage ? (
            <pre className="mt-6 overflow-auto rounded-[24px] border border-white/12 bg-ink/30 px-4 py-4 text-xs leading-6 text-white/75">
              {this.state.errorMessage}
            </pre>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="brand-button-primary"
            >
              โหลดใหม่
              <RefreshCcw size={16} />
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="brand-button-secondary border-white/15 bg-white/10 text-white hover:text-white"
            >
              กลับหน้าแรก
              <Home size={16} />
            </button>
          </div>
        </section>
      </div>
    );
  }
}

export default AppErrorBoundary;
