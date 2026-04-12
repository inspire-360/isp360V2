const defaultOrganization = "เครือข่ายผู้เชี่ยวชาญ DU";
const defaultRegion = "สนับสนุนได้ทั่วทั้งเครือข่าย";
const defaultServiceModes = ["online", "onsite", "hybrid"];
export const normalizeExpertDisplayName = (value = "") =>
  String(value || "").replace(/\s+/g, " ").trim();

export const expertSeedCatalog = [
  {
    category: "หมวดวิชาการและการออกแบบการเรียนรู้",
    description:
      "กลุ่มนี้เน้นเรื่องวิธีการสอนและโครงสร้างเนื้อหา เหมาะสำหรับโจทย์ที่ต้องการยกระดับรูปแบบการสอนให้มีประสิทธิภาพและน่าสนใจยิ่งขึ้น",
    groups: [
      {
        specialty: "ผู้เชี่ยวชาญด้านการออกแบบหลักสูตร",
        description:
          "ช่วยแก้โจทย์เนื้อหาไม่ทันสมัย ต้องการบูรณาการหลายวิชา หรือออกแบบรายวิชาใหม่ให้ตอบบริบทผู้เรียน",
        experts: [
          "นายธนาดุล นาต๊ะ",
          "นางชลธิชา ต๊ะอ้าย",
          "นางรวีวรรณ ต๊ะถิ่น",
          "นายยุทธพงษ์ กันนา",
        ],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการเรียนรู้เชิงรุกและการเรียนรู้ผ่านโครงงาน",
        description:
          "ช่วยออกแบบกิจกรรมเชิงรุก เช่น การเรียนรู้ผ่านโครงงาน เกมการเรียนรู้ และรูปแบบห้องเรียนที่ดึงการมีส่วนร่วมของผู้เรียน",
        experts: [
          "นางสาวสุพัตรา พฤกษ์สุวรรณ",
          "นางพรชนก ดุริยนิติชนม์",
          "นางสาวฐิติชญาณ์ ธิติจิระพงศ์",
          "นายอภิวัฒน์ ยอดอินทร์",
        ],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการวัดและประเมินผล",
        description:
          "ช่วยสร้างวิธีวัดผลที่หลากหลาย เช่น รูบริก การประเมินสมรรถนะ และการประเมินทักษะที่วัดยาก",
        experts: [
          "นางสาวมะลิ เพ็ญเกาะ",
          "นางรัชฎาพร บุญมาคำ",
          "นายยุทธพงษ์ กันนา",
        ],
      },
    ],
  },
  {
    category: "หมวดจิตวิทยาและการดูแลผู้เรียน",
    description:
      "กลุ่มนี้เน้นเรื่องพฤติกรรม สภาพจิตใจ และความหลากหลายของผู้เรียน เหมาะกับโจทย์ที่ต้องการความละเอียดอ่อนและการดูแลเชิงลึก",
    groups: [
      {
        specialty: "นักจิตวิทยาโรงเรียนและเด็ก",
        description:
          "ช่วยดูแลประเด็นแรงจูงใจ สุขภาวะทางใจ ความเครียด ภาวะซึมเศร้า และการกลั่นแกล้งในโรงเรียน",
        experts: ["นายอภิวัฒน์ ยอดอินทร์", "ดร.สุวิชชาภรณ์ ชนิลกุล"],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการศึกษาพิเศษ",
        description:
          "ช่วยออกแบบการจัดการเรียนรู้สำหรับผู้เรียนที่มีความต้องการพิเศษในห้องเรียนเรียนร่วม",
        experts: ["นางสาวพอบริ ชินคุปต์วาทิน", "นายอภิวัฒน์ ยอดอินทร์"],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการปรับพฤติกรรม",
        description:
          "ช่วยกรณีผู้เรียนมีพฤติกรรมก้าวร้าว ไม่ร่วมมือ หรือมีโจทย์ด้านการเข้าสังคมและระเบียบวินัย",
        experts: [
          "นายจารึก วิริยา",
          "นางสาวอรทัย ใจเถิน",
          "นายอำพล ผลไม้",
          "นางอาพร เกิดแก้ว",
          "นายสิทธิชัย อุตทาสา",
        ],
      },
    ],
  },
  {
    category: "หมวดเทคโนโลยีและสื่อนวัตกรรมการศึกษา",
    description:
      "กลุ่มนี้เน้นเครื่องมือและสื่อที่จะช่วยทุ่นแรงครู เปิดประสบการณ์ใหม่ให้ผู้เรียน และต่อยอดนวัตกรรมในชั้นเรียน",
    groups: [
      {
        specialty: "ผู้เชี่ยวชาญด้านเทคโนโลยีการศึกษา",
        description:
          "ช่วยครูเริ่มต้นใช้เทคโนโลยีใหม่ ปัญญาประดิษฐ์ และแพลตฟอร์มดิจิทัลเพื่อการสอนอย่างเป็นระบบ",
        experts: [
          "นายฤทธิพงษ์ จันทร์เงียบ",
          "นายอภิวัฒน์ ยอดอินทร์",
          "นางสาวจุฑารัตน์ วัดน้อย",
          "นายอภินัยน์ ส่าพอ",
          "นางรวีวรรณ ต๊ะถิ่น",
          "ดร.สุวิชชาภรณ์ ชนิลกุล",
        ],
      },
      {
        specialty: "นักออกแบบสื่อการเรียนรู้",
        description:
          "ช่วยออกแบบสื่อที่ดึงดูดและใช้ได้จริง ทั้งสื่อทำมือ สื่อเชิงโต้ตอบ วิดีโอสั้น และชุดกิจกรรมการเรียนรู้",
        experts: [
          "นางสาวสุพัตรา พฤกษ์สุวรรณ",
          "นางสาวกวินทรา อ้นจร",
          "นางสาวสุวิกานต์ วงษ์ปางมูล",
          "นางสาวกัญญาภัทร นิลชัด",
          "นางสาวสุภัสสรา เทียมแก้ว",
          "นางสาวรพีพรรณ แซ่เฮ้อ",
        ],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านระบบการเรียนรู้ออนไลน์และเทคโนโลยีสารสนเทศ",
        description:
          "ช่วยวางระบบส่งงานออนไลน์ ห้องเรียนเสมือน ฐานข้อมูลคะแนน และการจัดการระบบสารสนเทศในโรงเรียน",
        experts: [
          "นายฤทธิพงษ์ จันทร์เงียบ",
          "นายอภิวัฒน์ ยอดอินทร์",
          "นางสาวจุฑารัตน์ วัดน้อย",
        ],
      },
    ],
  },
  {
    category: "หมวดการบริหารจัดการห้องเรียนและเครือข่าย",
    description:
      "กลุ่มนี้เน้นสิ่งแวดล้อมรอบตัวเด็ก ทั้งการจัดชั้นเรียน พื้นที่เรียนรู้ และความร่วมมือจากผู้ปกครองหรือชุมชน",
    groups: [
      {
        specialty: "ผู้เชี่ยวชาญด้านการบริหารจัดการชั้นเรียน",
        description:
          "ช่วยโจทย์ห้องเรียนขนาดใหญ่ ควบคุมคลาสยาก หรือจัดสรรเวลาในคาบเรียนไม่ลงตัว",
        experts: [],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการออกแบบพื้นที่การเรียนรู้",
        description:
          "ช่วยปรับสภาพแวดล้อมห้องเรียน การจัดโต๊ะ และบรรยากาศให้เอื้อต่อความคิดสร้างสรรค์และการมีส่วนร่วม",
        experts: [],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการมีส่วนร่วมของผู้ปกครองและชุมชน",
        description:
          "ช่วยเชื่อมความร่วมมือจากผู้ปกครอง บ้าน และชุมชน เพื่อหนุนการเรียนรู้ของผู้เรียนรอบด้าน",
        experts: [],
      },
    ],
  },
  {
    category: "ผู้เชี่ยวชาญเฉพาะทาง",
    description:
      "กลุ่มนี้คือผู้เชี่ยวชาญเชิงลึกตามสาขาวิชาและทักษะเฉพาะ เหมาะกับโจทย์ที่ครูต้องการมุมมองจากตัวจริงในภาคสนาม",
    groups: [
      {
        specialty: "สายวิชาการเฉพาะทาง",
        description:
          "ช่วยเติมองค์ความรู้ลึกในสาขาวิชา เช่น วิทยาศาสตร์ คณิตศาสตร์ ภาษา และเนื้อหาเชิงวิชาการเฉพาะด้าน",
        experts: [
          "นางสาวสุวิกานต์ วงษ์ปางมูล",
          "นางสาวนฤมล เม่นวังแดง",
          "นางรวีวรรณ ต๊ะถิ่น",
          "นายยุทธพงษ์ กันนา",
          "นางสาววาสนา มนทิรสุวรรณ",
          "นางสาว สุภัสสรา เทียมแก้ว",
          "นางรัชฎาพร บุญมาคำ",
          "นายอภิวัฒน์ ยอดอินทร์",
          "นางสาวณัฐจุฑา ศิริวัฒน์",
        ],
      },
      {
        specialty: "สายทักษะแห่งอนาคต",
        description:
          "ช่วยเติมโจทย์ด้านโปรแกรมมิง การวิเคราะห์ข้อมูล วิศวกรรม และทักษะที่จำเป็นต่ออนาคตของผู้เรียน",
        experts: [
          "นายอภิวัฒน์ ยอดอินทร์",
          "นายฤทธิพงษ์ จันทร์เงียบ",
          "นางสาวจุฑารัตน์ วัดน้อย",
        ],
      },
      {
        specialty: "สายศิลปะและวิชาชีพ",
        description:
          "ช่วยต่อยอดโจทย์ด้านศิลปะ ดนตรี อาหาร อาชีพ และการเป็นผู้ประกอบการเชิงปฏิบัติ",
        experts: [
          "นางสาวปิ่นฉัตร คำปา",
          "นายอธิวัฒน์ ตันพรมเมือง",
          "นายจารึก วิริยา",
          "นายสงกรานต์ เขียวนา",
        ],
      },
    ],
  },
];

const createExpertDocumentId = (displayName = "") => {
  const normalized = Array.from(String(displayName || "").trim());
  const hash = normalized.reduce(
    (result, character) => ((result * 33) + character.codePointAt(0)) % 2147483647,
    5381,
  );

  return `expert_${hash.toString(36)}`;
};

const buildExpertBio = ({ displayName, specialties, categories }) => {
  const specialtyText = specialties.slice(0, 3).join(" / ");
  const categoryText = categories.slice(0, 2).join(" และ ");

  return `${displayName} อยู่ในฐานผู้เชี่ยวชาญ DU ด้าน ${specialtyText} พร้อมสนับสนุนครูในหมวด ${categoryText}`;
};

export const buildSeedExpertsFromCatalog = () => {
  const expertMap = new Map();

  expertSeedCatalog.forEach((categoryEntry) => {
    categoryEntry.groups.forEach((groupEntry) => {
      groupEntry.experts.forEach((displayName) => {
        const normalizedDisplayName = normalizeExpertDisplayName(displayName);
        const existingExpert = expertMap.get(normalizedDisplayName) || {
          id: createExpertDocumentId(normalizedDisplayName),
          displayName: normalizedDisplayName,
          title: groupEntry.specialty,
          organization: defaultOrganization,
          primaryExpertise: groupEntry.specialty,
          expertiseTags: [],
          serviceModes: [...defaultServiceModes],
          region: defaultRegion,
          bio: "",
          contactEmail: "",
          contactLine: "",
          isActive: true,
          capacityStatus: "available",
          _specialties: [],
          _categories: [],
        };

        if (!existingExpert._specialties.includes(groupEntry.specialty)) {
          existingExpert._specialties.push(groupEntry.specialty);
        }

        if (!existingExpert._categories.includes(categoryEntry.category)) {
          existingExpert._categories.push(categoryEntry.category);
        }

        existingExpert.expertiseTags = [
          ...new Set([...existingExpert._specialties, ...existingExpert._categories]),
        ];
        existingExpert.primaryExpertise = existingExpert._specialties[0] || groupEntry.specialty;
        existingExpert.title = existingExpert._specialties[0] || groupEntry.specialty;
        existingExpert.bio = buildExpertBio({
          displayName: normalizedDisplayName,
          specialties: existingExpert._specialties,
          categories: existingExpert._categories,
        });

        expertMap.set(normalizedDisplayName, existingExpert);
      });
    });
  });

  return Array.from(expertMap.values())
    .map((expertRecord) => {
      const {
        _specialties: omittedSpecialties,
        _categories: omittedCategories,
        ...expert
      } = expertRecord;

      void omittedSpecialties;
      void omittedCategories;

      return expert;
    })
    .sort((left, right) => String(left.displayName).localeCompare(String(right.displayName), "th"));
};

export const buildExpertSeedSummary = () => {
  const experts = buildSeedExpertsFromCatalog();

  return {
    expertCount: experts.length,
    placeholderCategories: expertSeedCatalog
      .filter((categoryEntry) =>
        categoryEntry.groups.every((groupEntry) => groupEntry.experts.length === 0),
      )
      .map((categoryEntry) => categoryEntry.category),
  };
};

export const buildExpertDirectorySections = (expertRecords = []) => {
  const expertLookup = new Map(
    expertRecords.map((expert) => [normalizeExpertDisplayName(expert.displayName), expert]),
  );

  return expertSeedCatalog.map((categoryEntry) => ({
    category: categoryEntry.category,
    description: categoryEntry.description || "",
    groups: categoryEntry.groups.map((groupEntry) => {
      const expertRows = groupEntry.experts.map((displayName) => {
        const normalizedDisplayName = normalizeExpertDisplayName(displayName);
        const matchedExpert = expertLookup.get(normalizedDisplayName) || null;

        return {
          displayName: normalizedDisplayName,
          matchedExpert,
        };
      });

      return {
        specialty: groupEntry.specialty,
        description: groupEntry.description || "",
        experts: expertRows,
        availableCount: expertRows.filter((item) => item.matchedExpert?.isActive !== false && item.matchedExpert).length,
      };
    }),
  }));
};
