const defaultOrganization = "เครือข่ายผู้เชี่ยวชาญ DU";
const defaultRegion = "สนับสนุนได้ทั่วทั้งเครือข่าย";
const defaultServiceModes = ["online", "onsite", "hybrid"];

export const expertSeedCatalog = [
  {
    category: "หมวดวิชาการและการออกแบบการเรียนรู้",
    groups: [
      {
        specialty: "นักออกแบบหลักสูตร",
        experts: [
          "นายธนาดุล นาต๊ะ",
          "นางชลธิชา ต๊ะอ้าย",
          "นางรวีวรรณ ต๊ะถิ่น",
          "นายยุทธพงษ์ กันนา",
        ],
      },
      {
        specialty: "ผู้เชี่ยวชาญ Active Learning/PBL",
        experts: [
          "นางสาวสุพัตรา พฤกษ์สุวรรณ",
          "นางพรชนก ดุริยนิติชนม์",
          "นางสาวฐิติชญาณ์ ธิติจิระพงศ์",
          "นายอภิวัฒน์ ยอดอินทร์",
        ],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการวัดและประเมินผล",
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
    groups: [
      {
        specialty: "นักจิตวิทยาโรงเรียน",
        experts: ["นายอภิวัฒน์ ยอดอินทร์", "ดร.สุวิชชาภรณ์ ชนิลกุล"],
      },
      {
        specialty: "ผู้เชี่ยวชาญการศึกษาพิเศษ",
        experts: ["นางสาวพอบริ ชินคุปต์วาทิน", "นายอภิวัฒน์ ยอดอินทร์"],
      },
      {
        specialty: "ผู้เชี่ยวชาญด้านการปรับพฤติกรรม",
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
    groups: [
      {
        specialty: "ผู้เชี่ยวชาญ EdTech",
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
        specialty: "ผู้เชี่ยวชาญ LMS/IT",
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
    groups: [
      {
        specialty: "การบริหารจัดการห้องเรียนและเครือข่าย",
        experts: [],
      },
    ],
  },
  {
    category: "ผู้เชี่ยวชาญเฉพาะทาง (SMEs)",
    groups: [
      {
        specialty: "สายวิชาการเฉพาะทาง",
        experts: [
          "นางสาวสุวิกานต์ วงษ์ปางมูล",
          "นางสาวนฤมล เม่นวังแดง",
          "นางรวีวรรณ ต๊ะถิ่น",
          "นายยุทธพงษ์ กันนา",
          "นางสาววาสนา มนทิรสุวรรณ",
          "นางสาวสุภัสสรา เทียมแก้ว",
          "นางรัชฎาพร บุญมาคำ",
          "นายอภิวัฒน์ ยอดอินทร์",
          "นางสาวณัฐจุฑา ศิริวัฒน์",
        ],
      },
      {
        specialty: "สายทักษะแห่งอนาคต",
        experts: [
          "นายอภิวัฒน์ ยอดอินทร์",
          "นายฤทธิพงษ์ จันทร์เงียบ",
          "นางสาวจุฑารัตน์ วัดน้อย",
        ],
      },
      {
        specialty: "สายศิลปะและวิชาชีพ",
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
        const existingExpert = expertMap.get(displayName) || {
          id: createExpertDocumentId(displayName),
          displayName,
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
          displayName,
          specialties: existingExpert._specialties,
          categories: existingExpert._categories,
        });

        expertMap.set(displayName, existingExpert);
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
