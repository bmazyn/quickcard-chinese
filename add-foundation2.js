// Script to add Foundation 2 cards to quizCards.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, 'src', 'data', 'quizCards.json');
const existingCards = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const foundation2Cards = [
  // Family deck (15 cards)
  {
    id: "foundation2-family-001",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "jiā rén — 家人",
    question: "What does this mean?",
    choices: { A: "Family members", B: "Friends", C: "Neighbors", D: "Relatives" },
    correct: "A",
    explanations: {
      A: "Correct! 家人 (jiā rén) means 'family members'",
      B: "Friends is 朋友 (péng you)",
      C: "Neighbors is 邻居 (lín jū)",
      D: "Relatives is 亲戚 (qīn qi)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-002",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "bà ba — 爸爸",
    question: "What does this mean?",
    choices: { A: "Uncle", B: "Father/Dad", C: "Grandfather", D: "Brother" },
    correct: "B",
    explanations: {
      A: "Uncle is 叔叔 (shū shu)",
      B: "Correct! 爸爸 (bà ba) means 'father' or 'dad'",
      C: "Grandfather is 爷爷 (yé ye)",
      D: "Brother is 哥哥 (gē ge) or 弟弟 (dì di)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-003",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "mā ma — 妈妈",
    question: "What does this mean?",
    choices: { A: "Aunt", B: "Sister", C: "Mother/Mom", D: "Grandmother" },
    correct: "C",
    explanations: {
      A: "Aunt is 阿姨 (ā yí)",
      B: "Sister is 姐姐 (jiě jie) or 妹妹 (mèi mei)",
      C: "Correct! 妈妈 (mā ma) means 'mother' or 'mom'",
      D: "Grandmother is 奶奶 (nǎi nai)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-004",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "ér zi — 儿子",
    question: "What does this mean?",
    choices: { A: "Daughter", B: "Son", C: "Child", D: "Brother" },
    correct: "B",
    explanations: {
      A: "Daughter is 女儿 (nǚ ér)",
      B: "Correct! 儿子 (ér zi) means 'son'",
      C: "Child is 孩子 (hái zi)",
      D: "Brother is 哥哥 (gē ge) or 弟弟 (dì di)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-005",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "nǚ ér — 女儿",
    question: "What does this mean?",
    choices: { A: "Son", B: "Sister", C: "Daughter", D: "Niece" },
    correct: "C",
    explanations: {
      A: "Son is 儿子 (ér zi)",
      B: "Sister is 姐姐 (jiě jie) or 妹妹 (mèi mei)",
      C: "Correct! 女儿 (nǚ ér) means 'daughter'",
      D: "Niece is 侄女 (zhí nǚ)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-006",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "gē ge — 哥哥",
    question: "What does this mean?",
    choices: { A: "Younger brother", B: "Older brother", C: "Father", D: "Uncle" },
    correct: "B",
    explanations: {
      A: "Younger brother is 弟弟 (dì di)",
      B: "Correct! 哥哥 (gē ge) means 'older brother'",
      C: "Father is 爸爸 (bà ba)",
      D: "Uncle is 叔叔 (shū shu)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-007",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "dì di — 弟弟",
    question: "What does this mean?",
    choices: { A: "Older brother", B: "Younger brother", C: "Son", D: "Cousin" },
    correct: "B",
    explanations: {
      A: "Older brother is 哥哥 (gē ge)",
      B: "Correct! 弟弟 (dì di) means 'younger brother'",
      C: "Son is 儿子 (ér zi)",
      D: "Cousin is 表兄弟 (biǎo xiōng dì)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-008",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "jiě jie — 姐姐",
    question: "What does this mean?",
    choices: { A: "Younger sister", B: "Mother", C: "Older sister", D: "Aunt" },
    correct: "C",
    explanations: {
      A: "Younger sister is 妹妹 (mèi mei)",
      B: "Mother is 妈妈 (mā ma)",
      C: "Correct! 姐姐 (jiě jie) means 'older sister'",
      D: "Aunt is 阿姨 (ā yí)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-009",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "mèi mei — 妹妹",
    question: "What does this mean?",
    choices: { A: "Older sister", B: "Younger sister", C: "Daughter", D: "Cousin" },
    correct: "B",
    explanations: {
      A: "Older sister is 姐姐 (jiě jie)",
      B: "Correct! 妹妹 (mèi mei) means 'younger sister'",
      C: "Daughter is 女儿 (nǚ ér)",
      D: "Cousin is 表姐妹 (biǎo jiě mèi)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-010",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "lǎo pó — 老婆",
    question: "What does this mean?",
    choices: { A: "Husband", B: "Wife", C: "Mother", D: "Girlfriend" },
    correct: "B",
    explanations: {
      A: "Husband is 老公 (lǎo gōng) or 丈夫 (zhàng fu)",
      B: "Correct! 老婆 (lǎo pó) means 'wife' (informal)",
      C: "Mother is 妈妈 (mā ma)",
      D: "Girlfriend is 女朋友 (nǚ péng you)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-011",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "lǎo gōng — 老公",
    question: "What does this mean?",
    choices: { A: "Wife", B: "Father", C: "Husband", D: "Boyfriend" },
    correct: "C",
    explanations: {
      A: "Wife is 老婆 (lǎo pó) or 妻子 (qī zi)",
      B: "Father is 爸爸 (bà ba)",
      C: "Correct! 老公 (lǎo gōng) means 'husband' (informal)",
      D: "Boyfriend is 男朋友 (nán péng you)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-012",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "hái zi — 孩子",
    question: "What does this mean?",
    choices: { A: "Adult", B: "Child/Children", C: "Student", D: "Baby" },
    correct: "B",
    explanations: {
      A: "Adult is 成年人 (chéng nián rén)",
      B: "Correct! 孩子 (hái zi) means 'child' or 'children'",
      C: "Student is 学生 (xué sheng)",
      D: "Baby is 婴儿 (yīng ér)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-013",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "yé ye — 爷爷",
    question: "What does this mean?",
    choices: { A: "Father", B: "Uncle", C: "Grandfather (paternal)", D: "Grandmother" },
    correct: "C",
    explanations: {
      A: "Father is 爸爸 (bà ba)",
      B: "Uncle is 叔叔 (shū shu)",
      C: "Correct! 爷爷 (yé ye) means 'grandfather' (father's side)",
      D: "Grandmother is 奶奶 (nǎi nai)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-014",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "nǎi nai — 奶奶",
    question: "What does this mean?",
    choices: { A: "Mother", B: "Aunt", C: "Grandmother (paternal)", D: "Grandfather" },
    correct: "C",
    explanations: {
      A: "Mother is 妈妈 (mā ma)",
      B: "Aunt is 阿姨 (ā yí)",
      C: "Correct! 奶奶 (nǎi nai) means 'grandmother' (father's side)",
      D: "Grandfather is 爷爷 (yé ye)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-family-015",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Family",
    level: "HSK1",
    promptLine: "jiā tíng — 家庭",
    question: "What does this mean?",
    choices: { A: "House", B: "Family (unit)", C: "Home", D: "Relatives" },
    correct: "B",
    explanations: {
      A: "House is 房子 (fáng zi)",
      B: "Correct! 家庭 (jiā tíng) means 'family' as a unit or household",
      C: "Home is 家 (jiā)",
      D: "Relatives is 亲戚 (qīn qi)"
    },
    tags: ["family", "hsk1"],
    difficulty: 1
  },

  // Places deck (15 cards)
  {
    id: "foundation2-places-001",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "jiā — 家",
    question: "What does this mean?",
    choices: { A: "Home/House", B: "School", C: "Office", D: "Hotel" },
    correct: "A",
    explanations: {
      A: "Correct! 家 (jiā) means 'home' or 'house'",
      B: "School is 学校 (xué xiào)",
      C: "Office is 办公室 (bàn gōng shì)",
      D: "Hotel is 酒店 (jiǔ diàn)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-002",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "xué xiào — 学校",
    question: "What does this mean?",
    choices: { A: "Library", B: "School", C: "University", D: "Classroom" },
    correct: "B",
    explanations: {
      A: "Library is 图书馆 (tú shū guǎn)",
      B: "Correct! 学校 (xué xiào) means 'school'",
      C: "University is 大学 (dà xué)",
      D: "Classroom is 教室 (jiào shì)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-003",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "gōng sī — 公司",
    question: "What does this mean?",
    choices: { A: "Company", B: "Factory", C: "Store", D: "Office" },
    correct: "A",
    explanations: {
      A: "Correct! 公司 (gōng sī) means 'company'",
      B: "Factory is 工厂 (gōng chǎng)",
      C: "Store is 商店 (shāng diàn)",
      D: "Office is 办公室 (bàn gōng shì)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-004",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "yín háng — 银行",
    question: "What does this mean?",
    choices: { A: "Post office", B: "Bank", C: "Store", D: "Hospital" },
    correct: "B",
    explanations: {
      A: "Post office is 邮局 (yóu jú)",
      B: "Correct! 银行 (yín háng) means 'bank'",
      C: "Store is 商店 (shāng diàn)",
      D: "Hospital is 医院 (yī yuàn)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-005",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "yī yuàn — 医院",
    question: "What does this mean?",
    choices: { A: "Clinic", B: "Pharmacy", C: "Hospital", D: "Doctor's office" },
    correct: "C",
    explanations: {
      A: "Clinic is 诊所 (zhěn suǒ)",
      B: "Pharmacy is 药店 (yào diàn)",
      C: "Correct! 医院 (yī yuàn) means 'hospital'",
      D: "Doctor's office is 诊所 (zhěn suǒ)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-006",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "shāng diàn — 商店",
    question: "What does this mean?",
    choices: { A: "Market", B: "Store/Shop", C: "Mall", D: "Restaurant" },
    correct: "B",
    explanations: {
      A: "Market is 市场 (shì chǎng)",
      B: "Correct! 商店 (shāng diàn) means 'store' or 'shop'",
      C: "Mall is 商场 (shāng chǎng)",
      D: "Restaurant is 餐厅 (cān tīng)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-007",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "cān tīng — 餐厅",
    question: "What does this mean?",
    choices: { A: "Kitchen", B: "Cafe", C: "Restaurant", D: "Bar" },
    correct: "C",
    explanations: {
      A: "Kitchen is 厨房 (chú fáng)",
      B: "Cafe is 咖啡馆 (kā fēi guǎn)",
      C: "Correct! 餐厅 (cān tīng) means 'restaurant'",
      D: "Bar is 酒吧 (jiǔ bā)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-008",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "chāo shì — 超市",
    question: "What does this mean?",
    choices: { A: "Store", B: "Market", C: "Supermarket", D: "Mall" },
    correct: "C",
    explanations: {
      A: "Store is 商店 (shāng diàn)",
      B: "Market is 市场 (shì chǎng)",
      C: "Correct! 超市 (chāo shì) means 'supermarket'",
      D: "Mall is 商场 (shāng chǎng)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-009",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "jiǔ diàn — 酒店",
    question: "What does this mean?",
    choices: { A: "Bar", B: "Restaurant", C: "Hotel", D: "Motel" },
    correct: "C",
    explanations: {
      A: "Bar is 酒吧 (jiǔ bā)",
      B: "Restaurant is 餐厅 (cān tīng)",
      C: "Correct! 酒店 (jiǔ diàn) means 'hotel'",
      D: "Motel is 汽车旅馆 (qì chē lǚ guǎn)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-010",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "jī chǎng — 机场",
    question: "What does this mean?",
    choices: { A: "Train station", B: "Bus station", C: "Airport", D: "Port" },
    correct: "C",
    explanations: {
      A: "Train station is 火车站 (huǒ chē zhàn)",
      B: "Bus station is 公交车站 (gōng jiāo chē zhàn)",
      C: "Correct! 机场 (jī chǎng) means 'airport'",
      D: "Port is 港口 (gǎng kǒu)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-011",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "chē zhàn — 车站",
    question: "What does this mean?",
    choices: { A: "Airport", B: "Station (bus/train)", C: "Parking lot", D: "Highway" },
    correct: "B",
    explanations: {
      A: "Airport is 机场 (jī chǎng)",
      B: "Correct! 车站 (chē zhàn) means 'station' (bus or train)",
      C: "Parking lot is 停车场 (tíng chē chǎng)",
      D: "Highway is 高速公路 (gāo sù gōng lù)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-012",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "tú shū guǎn — 图书馆",
    question: "What does this mean?",
    choices: { A: "Museum", B: "Library", C: "Bookstore", D: "School" },
    correct: "B",
    explanations: {
      A: "Museum is 博物馆 (bó wù guǎn)",
      B: "Correct! 图书馆 (tú shū guǎn) means 'library'",
      C: "Bookstore is 书店 (shū diàn)",
      D: "School is 学校 (xué xiào)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-013",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "gōng yuán — 公园",
    question: "What does this mean?",
    choices: { A: "Garden", B: "Park", C: "Zoo", D: "Square" },
    correct: "B",
    explanations: {
      A: "Garden is 花园 (huā yuán)",
      B: "Correct! 公园 (gōng yuán) means 'park'",
      C: "Zoo is 动物园 (dòng wù yuán)",
      D: "Square is 广场 (guǎng chǎng)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-014",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "bàn gōng shì — 办公室",
    question: "What does this mean?",
    choices: { A: "Classroom", B: "Meeting room", C: "Office", D: "Company" },
    correct: "C",
    explanations: {
      A: "Classroom is 教室 (jiào shì)",
      B: "Meeting room is 会议室 (huì yì shì)",
      C: "Correct! 办公室 (bàn gōng shì) means 'office'",
      D: "Company is 公司 (gōng sī)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-places-015",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Places",
    level: "HSK1",
    promptLine: "xǐ shǒu jiān — 洗手间",
    question: "What does this mean?",
    choices: { A: "Kitchen", B: "Bedroom", C: "Bathroom/Restroom", D: "Living room" },
    correct: "C",
    explanations: {
      A: "Kitchen is 厨房 (chú fáng)",
      B: "Bedroom is 卧室 (wò shì)",
      C: "Correct! 洗手间 (xǐ shǒu jiān) means 'bathroom' or 'restroom'",
      D: "Living room is 客厅 (kè tīng)"
    },
    tags: ["places", "hsk1"],
    difficulty: 1
  },

  // Countries deck (15 cards)
  {
    id: "foundation2-countries-001",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Zhōng guó — 中国",
    question: "What country is this?",
    choices: { A: "Japan", B: "China", C: "Korea", D: "Taiwan" },
    correct: "B",
    explanations: {
      A: "Japan is 日本 (Rì běn)",
      B: "Correct! 中国 (Zhōng guó) means 'China'",
      C: "Korea is 韩国 (Hán guó)",
      D: "Taiwan is 台湾 (Tái wān)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-002",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Měi guó — 美国",
    question: "What country is this?",
    choices: { A: "United States", B: "Canada", C: "Mexico", D: "Brazil" },
    correct: "A",
    explanations: {
      A: "Correct! 美国 (Měi guó) means 'United States' or 'America'",
      B: "Canada is 加拿大 (Jiā ná dà)",
      C: "Mexico is 墨西哥 (Mò xī gē)",
      D: "Brazil is 巴西 (Bā xī)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-003",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Yīng guó — 英国",
    question: "What country is this?",
    choices: { A: "United States", B: "England/UK", C: "Australia", D: "Ireland" },
    correct: "B",
    explanations: {
      A: "United States is 美国 (Měi guó)",
      B: "Correct! 英国 (Yīng guó) means 'England' or 'United Kingdom'",
      C: "Australia is 澳大利亚 (Ào dà lì yà)",
      D: "Ireland is 爱尔兰 (Ài ěr lán)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-004",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Jiā ná dà — 加拿大",
    question: "What country is this?",
    choices: { A: "United States", B: "Mexico", C: "Canada", D: "Brazil" },
    correct: "C",
    explanations: {
      A: "United States is 美国 (Měi guó)",
      B: "Mexico is 墨西哥 (Mò xī gē)",
      C: "Correct! 加拿大 (Jiā ná dà) means 'Canada'",
      D: "Brazil is 巴西 (Bā xī)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-005",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Ào dà lì yà — 澳大利亚",
    question: "What country is this?",
    choices: { A: "Austria", B: "New Zealand", C: "Australia", D: "England" },
    correct: "C",
    explanations: {
      A: "Austria is 奥地利 (Ào dì lì)",
      B: "New Zealand is 新西兰 (Xīn xī lán)",
      C: "Correct! 澳大利亚 (Ào dà lì yà) means 'Australia'",
      D: "England is 英国 (Yīng guó)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-006",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Rì běn — 日本",
    question: "What country is this?",
    choices: { A: "China", B: "Korea", C: "Japan", D: "Vietnam" },
    correct: "C",
    explanations: {
      A: "China is 中国 (Zhōng guó)",
      B: "Korea is 韩国 (Hán guó)",
      C: "Correct! 日本 (Rì běn) means 'Japan'",
      D: "Vietnam is 越南 (Yuè nán)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-007",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Hán guó — 韩国",
    question: "What country is this?",
    choices: { A: "Japan", B: "China", C: "Korea", D: "Thailand" },
    correct: "C",
    explanations: {
      A: "Japan is 日本 (Rì běn)",
      B: "China is 中国 (Zhōng guó)",
      C: "Correct! 韩国 (Hán guó) means 'Korea' (South Korea)",
      D: "Thailand is 泰国 (Tài guó)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-008",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Dé guó — 德国",
    question: "What country is this?",
    choices: { A: "France", B: "Germany", C: "Austria", D: "Switzerland" },
    correct: "B",
    explanations: {
      A: "France is 法国 (Fǎ guó)",
      B: "Correct! 德国 (Dé guó) means 'Germany'",
      C: "Austria is 奥地利 (Ào dì lì)",
      D: "Switzerland is 瑞士 (Ruì shì)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-009",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Fǎ guó — 法国",
    question: "What country is this?",
    choices: { A: "Germany", B: "France", C: "Italy", D: "Spain" },
    correct: "B",
    explanations: {
      A: "Germany is 德国 (Dé guó)",
      B: "Correct! 法国 (Fǎ guó) means 'France'",
      C: "Italy is 意大利 (Yì dà lì)",
      D: "Spain is 西班牙 (Xī bān yá)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-010",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Xī bān yá — 西班牙",
    question: "What country is this?",
    choices: { A: "Portugal", B: "Italy", C: "Spain", D: "Mexico" },
    correct: "C",
    explanations: {
      A: "Portugal is 葡萄牙 (Pú táo yá)",
      B: "Italy is 意大利 (Yì dà lì)",
      C: "Correct! 西班牙 (Xī bān yá) means 'Spain'",
      D: "Mexico is 墨西哥 (Mò xī gē)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-011",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Yì dà lì — 意大利",
    question: "What country is this?",
    choices: { A: "France", B: "Spain", C: "Italy", D: "Greece" },
    correct: "C",
    explanations: {
      A: "France is 法国 (Fǎ guó)",
      B: "Spain is 西班牙 (Xī bān yá)",
      C: "Correct! 意大利 (Yì dà lì) means 'Italy'",
      D: "Greece is 希腊 (Xī là)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-012",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "É luó sī — 俄罗斯",
    question: "What country is this?",
    choices: { A: "Poland", B: "Ukraine", C: "Russia", D: "Kazakhstan" },
    correct: "C",
    explanations: {
      A: "Poland is 波兰 (Bō lán)",
      B: "Ukraine is 乌克兰 (Wū kè lán)",
      C: "Correct! 俄罗斯 (É luó sī) means 'Russia'",
      D: "Kazakhstan is 哈萨克斯坦 (Hā sà kè sī tǎn)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-013",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Bā xī — 巴西",
    question: "What country is this?",
    choices: { A: "Argentina", B: "Brazil", C: "Mexico", D: "Peru" },
    correct: "B",
    explanations: {
      A: "Argentina is 阿根廷 (Ā gēn tíng)",
      B: "Correct! 巴西 (Bā xī) means 'Brazil'",
      C: "Mexico is 墨西哥 (Mò xī gē)",
      D: "Peru is 秘鲁 (Mì lǔ)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-014",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Mò xī gē — 墨西哥",
    question: "What country is this?",
    choices: { A: "United States", B: "Brazil", C: "Mexico", D: "Colombia" },
    correct: "C",
    explanations: {
      A: "United States is 美国 (Měi guó)",
      B: "Brazil is 巴西 (Bā xī)",
      C: "Correct! 墨西哥 (Mò xī gē) means 'Mexico'",
      D: "Colombia is 哥伦比亚 (Gē lún bǐ yà)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-countries-015",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Countries",
    level: "HSK1",
    promptLine: "Yìn dù — 印度",
    question: "What country is this?",
    choices: { A: "Pakistan", B: "Bangladesh", C: "India", D: "Nepal" },
    correct: "C",
    explanations: {
      A: "Pakistan is 巴基斯坦 (Bā jī sī tǎn)",
      B: "Bangladesh is 孟加拉国 (Mèng jiā lā guó)",
      C: "Correct! 印度 (Yìn dù) means 'India'",
      D: "Nepal is 尼泊尔 (Ní bó ěr)"
    },
    tags: ["countries", "hsk1"],
    difficulty: 1
  },

  // Dates deck (15 cards)
  {
    id: "foundation2-dates-001",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "xīng qī yī — 星期一",
    question: "What day is this?",
    choices: { A: "Monday", B: "Tuesday", C: "Sunday", D: "Friday" },
    correct: "A",
    explanations: {
      A: "Correct! 星期一 (xīng qī yī) means 'Monday'",
      B: "Tuesday is 星期二 (xīng qī èr)",
      C: "Sunday is 星期天 (xīng qī tiān)",
      D: "Friday is 星期五 (xīng qī wǔ)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-002",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "xīng qī wǔ — 星期五",
    question: "What day is this?",
    choices: { A: "Thursday", B: "Friday", C: "Saturday", D: "Sunday" },
    correct: "B",
    explanations: {
      A: "Thursday is 星期四 (xīng qī sì)",
      B: "Correct! 星期五 (xīng qī wǔ) means 'Friday'",
      C: "Saturday is 星期六 (xīng qī liù)",
      D: "Sunday is 星期天 (xīng qī tiān)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-003",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "xīng qī tiān — 星期天",
    question: "What day is this?",
    choices: { A: "Saturday", B: "Monday", C: "Sunday", D: "Friday" },
    correct: "C",
    explanations: {
      A: "Saturday is 星期六 (xīng qī liù)",
      B: "Monday is 星期一 (xīng qī yī)",
      C: "Correct! 星期天 (xīng qī tiān) means 'Sunday'",
      D: "Friday is 星期五 (xīng qī wǔ)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-004",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "yī jiǔ jiǔ wǔ nián — 一九九五年",
    question: "What year is this?",
    choices: { A: "1995", B: "1985", C: "2005", D: "1999" },
    correct: "A",
    explanations: {
      A: "Correct! 一九九五年 means '1995'",
      B: "1985 is 一九八五年 (yī jiǔ bā wǔ nián)",
      C: "2005 is 二零零五年 (èr líng líng wǔ nián)",
      D: "1999 is 一九九九年 (yī jiǔ jiǔ jiǔ nián)"
    },
    tags: ["dates", "numbers", "hsk1"],
    difficulty: 2
  },
  {
    id: "foundation2-dates-005",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "èr líng yī èr nián — 二零一二年",
    question: "What year is this?",
    choices: { A: "2002", B: "2012", C: "2022", D: "2011" },
    correct: "B",
    explanations: {
      A: "2002 is 二零零二年 (èr líng líng èr nián)",
      B: "Correct! 二零一二年 means '2012'",
      C: "2022 is 二零二二年 (èr líng èr èr nián)",
      D: "2011 is 二零一一年 (èr líng yī yī nián)"
    },
    tags: ["dates", "numbers", "hsk1"],
    difficulty: 2
  },
  {
    id: "foundation2-dates-006",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "sān yuè — 三月",
    question: "What month is this?",
    choices: { A: "February", B: "March", C: "April", D: "May" },
    correct: "B",
    explanations: {
      A: "February is 二月 (èr yuè)",
      B: "Correct! 三月 (sān yuè) means 'March'",
      C: "April is 四月 (sì yuè)",
      D: "May is 五月 (wǔ yuè)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-007",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "qī yuè — 七月",
    question: "What month is this?",
    choices: { A: "June", B: "July", C: "August", D: "September" },
    correct: "B",
    explanations: {
      A: "June is 六月 (liù yuè)",
      B: "Correct! 七月 (qī yuè) means 'July'",
      C: "August is 八月 (bā yuè)",
      D: "September is 九月 (jiǔ yuè)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-008",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "shí yī yuè — 十一月",
    question: "What month is this?",
    choices: { A: "October", B: "November", C: "December", D: "January" },
    correct: "B",
    explanations: {
      A: "October is 十月 (shí yuè)",
      B: "Correct! 十一月 (shí yī yuè) means 'November'",
      C: "December is 十二月 (shí èr yuè)",
      D: "January is 一月 (yī yuè)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-009",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "èr líng yī èr nián qī yuè shí wǔ hào — 二零一二年七月十五号",
    question: "What date is this?",
    choices: { A: "July 15, 2012", B: "May 17, 2012", C: "July 25, 2012", D: "June 15, 2012" },
    correct: "A",
    explanations: {
      A: "Correct! 二零一二年七月十五号 means 'July 15, 2012'",
      B: "May 17, 2012 is 二零一二年五月十七号",
      C: "July 25, 2012 is 二零一二年七月二十五号",
      D: "June 15, 2012 is 二零一二年六月十五号"
    },
    tags: ["dates", "numbers", "hsk1"],
    difficulty: 2
  },
  {
    id: "foundation2-dates-010",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "yī jiǔ jiǔ wǔ nián shí yī yuè sān hào — 一九九五年十一月三号",
    question: "What date is this?",
    choices: { A: "November 3, 1995", B: "November 13, 1995", C: "October 3, 1995", D: "December 3, 1995" },
    correct: "A",
    explanations: {
      A: "Correct! 一九九五年十一月三号 means 'November 3, 1995'",
      B: "November 13, 1995 is 一九九五年十一月十三号",
      C: "October 3, 1995 is 一九九五年十月三号",
      D: "December 3, 1995 is 一九九五年十二月三号"
    },
    tags: ["dates", "numbers", "hsk1"],
    difficulty: 2
  },
  {
    id: "foundation2-dates-011",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "nián — 年",
    question: "What does this mean?",
    choices: { A: "Month", B: "Year", C: "Day", D: "Week" },
    correct: "B",
    explanations: {
      A: "Month is 月 (yuè)",
      B: "Correct! 年 (nián) means 'year'",
      C: "Day is 天 (tiān) or 日 (rì)",
      D: "Week is 星期 (xīng qī)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-012",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "yuè — 月",
    question: "What does this mean?",
    choices: { A: "Year", B: "Month", C: "Day", D: "Week" },
    correct: "B",
    explanations: {
      A: "Year is 年 (nián)",
      B: "Correct! 月 (yuè) means 'month' (also 'moon')",
      C: "Day is 天 (tiān) or 日 (rì)",
      D: "Week is 星期 (xīng qī)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-013",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "hào — 号",
    question: "What does this mean in dates?",
    choices: { A: "Number", B: "Day (of month)", C: "Hour", D: "Minute" },
    correct: "B",
    explanations: {
      A: "Number is 数字 (shù zì)",
      B: "Correct! 号 (hào) means 'day of the month' in dates",
      C: "Hour is 小时 (xiǎo shí)",
      D: "Minute is 分钟 (fēn zhōng)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-014",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "jīn tiān — 今天",
    question: "What does this mean?",
    choices: { A: "Yesterday", B: "Today", C: "Tomorrow", D: "Now" },
    correct: "B",
    explanations: {
      A: "Yesterday is 昨天 (zuó tiān)",
      B: "Correct! 今天 (jīn tiān) means 'today'",
      C: "Tomorrow is 明天 (míng tiān)",
      D: "Now is 现在 (xiàn zài)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  },
  {
    id: "foundation2-dates-015",
    kind: "vocab",
    section: "Foundation 2",
    deck: "Dates",
    level: "HSK1",
    promptLine: "míng tiān — 明天",
    question: "What does this mean?",
    choices: { A: "Today", B: "Yesterday", C: "Tomorrow", D: "Next week" },
    correct: "C",
    explanations: {
      A: "Today is 今天 (jīn tiān)",
      B: "Yesterday is 昨天 (zuó tiān)",
      C: "Correct! 明天 (míng tiān) means 'tomorrow'",
      D: "Next week is 下星期 (xià xīng qī)"
    },
    tags: ["dates", "time", "hsk1"],
    difficulty: 1
  }
];

// Append to existing cards
const allCards = [...existingCards, ...foundation2Cards];

// Write back to quizCards.json
fs.writeFileSync(dataPath, JSON.stringify(allCards, null, 2), 'utf8');

console.log(`Successfully added ${foundation2Cards.length} new cards to quizCards.json`);
console.log(`Total cards: ${allCards.length}`);
console.log('\nNew Foundation 2 decks:');
console.log('  Family: 15 cards (foundation2-family-001 to foundation2-family-015)');
console.log('  Places: 15 cards (foundation2-places-001 to foundation2-places-015)');
console.log('  Countries: 15 cards (foundation2-countries-001 to foundation2-countries-015)');
console.log('  Dates: 15 cards (foundation2-dates-001 to foundation2-dates-015)');
