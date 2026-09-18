export type CapabilityColumn = {
  id: string;
  name: string;
  productModel: string;
  image: string;
  description: string;
};

export type CapabilityRow = {
  label: string;
  values: readonly string[];
};

export type CapabilityPageContent = {
  eyebrow: string;
  title: string;
  lead: string;
  note: string;
  tableTitle: string;
  models: CapabilityColumn[];
  rows: CapabilityRow[];
};

export const CAPABILITY_PAGE = {
  eyebrow: "Коммерция и промышленность",
  title: "Коммерческая и промышленная система хранения энергии",
  lead: "Цен на этой странице нет: это ориентиры по характеристикам. С такими параметрами мы можем выпускать системы под ваш объект — мощность, ёмкость и комплектацию согласуем отдельно.",
  note: "Характеристики сведены из предоставленных данных. Итоговая спецификация фиксируется в коммерческом предложении.",
  tableTitle: "Сравнительная таблица аккумуляторных систем",
} as const;

export function fallbackCapabilityImage(slug: string) {
  return `/capability/${slug}.png`;
}

export const CAPABILITY_COLUMNS = [
  {
    id: "fp115",
    name: "FP115KWH",
    productModel: "FP115KWH",
    image: "/capability/fp115.png",
    description: "115,2 кВт·ч · 50 кВт",
  },
  {
    id: "fp215",
    name: "FP215KWH",
    productModel: "CT-ES-215/AC",
    image: "/capability/fp215.png",
    description: "215 кВт·ч · 100 кВт",
  },
  {
    id: "fp3350",
    name: "FP3.35МВтч",
    productModel: "CT-ES-3.35МВтч/AC",
    image: "/capability/fp3350.png",
    description: "3,35 МВт·ч · Контейнер 20GP",
  },
  {
    id: "fp40",
    name: "FP40КВтч",
    productModel: "CT-ES-40/AC",
    image: "/capability/fp40.png",
    description: "40 кВт·ч · 20 кВт",
  },
] as const satisfies readonly CapabilityColumn[];

export const CAPABILITY_ROWS = [
  {
    label: "Модель изделия",
    values: ["FP115KWH", "CT-ES-215/AC", "CT-ES-3.35МВтч/AC", "CT-ES-40/AC"],
  },
  {
    label: "Тип аккумулятора / элемента",
    values: [
      "LFP, 3,2 В / 150 А·ч",
      "LFP, 280 А·ч",
      "280 А·ч",
      "LFP, 3,2 В / 100 А·ч",
    ],
  },
  {
    label: "Модуль аккумулятора",
    values: ["48S1P, 153,6 В / 150 А·ч, 23,04 кВт·ч", "—", "—", "—"],
  },
  {
    label: "Количество модулей аккумулятора",
    values: ["5 шт.", "—", "—", "—"],
  },
  {
    label: "Конфигурация системы",
    values: ["—", "1P240S", "9P416S", "1P48S"],
  },
  {
    label: "Ёмкость аккумулятора",
    values: ["115,2 кВт·ч", "215 кВт·ч", "3,35 МВт·ч", "40 кВт·ч"],
  },
  {
    label: "Номинальное напряжение аккумулятора",
    values: ["768 В", "—", "—", "—"],
  },
  {
    label: "Диапазон напряжения аккумулятора",
    values: [
      "648–876 В (2,7–3,65 В на ячейку)",
      "672–864 В",
      "1040,0–1518,4 В",
      "520–700 В (2,7–3,65 В на ячейку)",
    ],
  },
  {
    label: "Скорость заряда/разряда",
    values: ["≤1C", "—", "0,5P", "≤0,5C"],
  },
  {
    label: "Глубина разряда (DOD)",
    values: ["95%", "—", "—", "—"],
  },
  {
    label: "Метод контроля температуры",
    values: [
      "—",
      "Жидкостное охлаждение",
      "Жидкостное охлаждение",
      "Жидкостное охлаждение",
    ],
  },
  {
    label: "Метод охлаждения",
    values: [
      "Интеллектуальное воздушное охлаждение",
      "Жидкостное охлаждение аккумуляторных отсеков; воздушное охлаждение электрического отсека",
      "Жидкостное охлаждение",
      "Интеллектуальное воздушное охлаждение",
    ],
  },
  {
    label: "Система подавления огня",
    values: ["Газовая система пожаротушения", "—", "—", "—"],
  },
  {
    label: "Номинальная мощность",
    values: ["50 кВт", "100 кВт", "—", "20 кВт"],
  },
  {
    label: "Номинальное напряжение сети",
    values: ["230/400 В", "400 В AC (340–440 В)", "—", "230/400 В"],
  },
  {
    label: "Диапазон напряжения сети",
    values: ["±15%", "340–440 В", "—", "−20%…+15%"],
  },
  {
    label: "Частота сети",
    values: ["50/60 Гц", "50/60 Гц", "—", "50/60 Гц"],
  },
  {
    label: "Номинальный ток",
    values: ["—", "250 А", "—", "—"],
  },
  {
    label: "Тип сети",
    values: ["—", "3P3W", "—", "—"],
  },
  {
    label: "Регулируемый диапазон коэффициента мощности",
    values: ["—", "−1…+1", "—", "—"],
  },
  {
    label: "Тип подключения",
    values: [
      "Трёхфазная трёхпроводная / трёхфазная четырёхпроводная система",
      "—",
      "—",
      "Трёхфазный четырёхпроводной",
    ],
  },
  {
    label: "Гармоники переменного тока",
    values: ["<3% (при номинальной мощности)", "—", "—", "—"],
  },
  {
    label: "Постоянная составляющая тока (DC)",
    values: ["<0,5%", "—", "—", "—"],
  },
  {
    label: "Максимальная эффективность AC",
    values: ["98,50%", "—", "—", "—"],
  },
  {
    label: "PV-напряжение",
    values: ["0–635 В", "—", "—", "—"],
  },
  {
    label: "Максимальная эффективность PV",
    values: [">99%", "—", "—", "—"],
  },
  {
    label: "Интерфейс связи",
    values: [
      "RS485/CAN; RS485/CAN/Ethernet; для PV — RS485",
      "CAN/RS485/Ethernet",
      "MODBUS RTU/TCP; IEC 104; IEC 61850",
      "CAN/RS485",
    ],
  },
  {
    label: "Место установки",
    values: [
      "На открытом воздухе; рекомендуется установка с защитной крышей",
      "—",
      "—",
      "—",
    ],
  },
  {
    label: "Степень защиты",
    values: ["IP55", "IP54", "IP55", "IP55"],
  },
  {
    label: "Класс сопротивления коррозии",
    values: ["N", "—", "—", "—"],
  },
  {
    label: "Диапазон рабочей влажности",
    values: ["0–95% (без конденсации)", "—", "—", "—"],
  },
  {
    label: "Рабочая температура",
    values: ["−20…+55 °C", "−20…+55 °C", "−30…+55 °C", "−20…+60 °C"],
  },
  {
    label: "Максимальная рабочая высота",
    values: ["3000 м; свыше 2000 м — с пониженной мощностью", "—", "—", "—"],
  },
  {
    label: "Размеры (Д×Ш×В)",
    values: [
      "940×1000×2060 мм",
      "1500×1450×2250 мм",
      "20-футовый контейнер (20GP)",
      "860×1025×1500 мм",
    ],
  },
  {
    label: "Вес",
    values: ["1500 кг", "2000 кг", "≤35 т", "Около 750 кг"],
  },
] as const satisfies readonly CapabilityRow[];

export const FALLBACK_CAPABILITY_PAGE: CapabilityPageContent = {
  eyebrow: CAPABILITY_PAGE.eyebrow,
  title: CAPABILITY_PAGE.title,
  lead: CAPABILITY_PAGE.lead,
  note: CAPABILITY_PAGE.note,
  tableTitle: CAPABILITY_PAGE.tableTitle,
  models: CAPABILITY_COLUMNS.map((column) => ({ ...column })),
  rows: CAPABILITY_ROWS.map((row) => ({
    label: row.label,
    values: [...row.values],
  })),
};

const PRICE_LIKE = /(?:^|\s)(?:\d[\d\s]*[.,]?\d*)\s*(?:₽|руб|RUB)/i;

export function capabilityHasNoPrices(
  rows: readonly CapabilityRow[] = CAPABILITY_ROWS,
) {
  return rows.every((row) =>
    row.values.every((value) => !PRICE_LIKE.test(value)),
  );
}
