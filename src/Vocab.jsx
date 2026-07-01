import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
} from 'lucide-react';
import { EXTRA_SEEDED_TOPICS } from './vocabSeedExtra.js';

const SEEDED_TOPIC_ID = 'topic-recruitment-1';
const SEEDED_RESTORE_VERSION = 1;

const SEEDED_WORDS = [
  {
    english: 'opening',
    partOfSpeech: 'n.',
    vietnamese: 'vị trí trống, sự mở cửa, lễ khai trương',
    ipaUk: '/ˈəʊ.pən.ɪŋ/',
    ipaUs: '/ˈoʊ.pən.ɪŋ/',
    related: 'vacancy: khoảng trống, vị trí trống',
    example: 'A huge crowd turned out for the opening of the new show.',
    exampleVi: 'Một đám đông lớn đã đến để khai mạc buổi biểu diễn mới.',
  },
  {
    english: 'applicant',
    partOfSpeech: 'n.',
    vietnamese: 'ứng viên, người xin việc',
    ipaUk: '/ˈæp.lɪ.kənt/',
    ipaUs: '/ˈæp.lə.kənt/',
    related: 'apply (v): ứng tuyển; application (n): đơn ứng tuyển',
    example: 'Successful applicants will be notified in writing.',
    exampleVi: 'Các ứng viên thành công sẽ được thông báo bằng văn bản.',
  },
  {
    english: 'meet',
    partOfSpeech: 'v.',
    vietnamese: 'thỏa mãn, đáp ứng yêu cầu hoặc điều kiện',
    ipaUk: '/miːt/',
    ipaUs: '/miːt/',
    related: 'satisfy, fulfill: thỏa mãn, đáp ứng',
    example: 'They will only agree to sign the contract if certain conditions are met.',
    exampleVi: 'Họ chỉ đồng ý ký hợp đồng khi một số điều kiện được đáp ứng.',
  },
  {
    english: 'qualified',
    partOfSpeech: 'adj.',
    vietnamese: 'đủ khả năng, trình độ hoặc điều kiện',
    ipaUk: '/ˈkwɒl.ɪ.faɪd/',
    ipaUs: '/ˈkwɑː.lə.faɪd/',
    related: 'eligible, competent, capable: đủ điều kiện, có năng lực',
    example: 'We need qualified candidates for the accounting position.',
    exampleVi: 'Chúng tôi cần những ứng viên đủ năng lực cho vị trí kế toán.',
  },
  {
    english: 'candidate',
    partOfSpeech: 'n.',
    vietnamese: 'thí sinh, ứng viên',
    ipaUk: '/ˈkæn.dɪ.dət/',
    ipaUs: '/ˈkæn.dɪ.dət/',
    related: 'applicant, contender: ứng viên, người dự tuyển',
    example: 'Each candidate must submit a resume before Friday.',
    exampleVi: 'Mỗi ứng viên phải nộp CV trước thứ Sáu.',
  },
  {
    english: 'confidence',
    partOfSpeech: 'n.',
    vietnamese: 'sự tin tưởng, lòng tin',
    ipaUk: '/ˈkɒn.fɪ.dəns/',
    ipaUs: '/ˈkɑːn.fə.dəns/',
    related: 'trust, belief: sự tin tưởng',
    example: 'Her confidence increased after the training session.',
    exampleVi: 'Sự tự tin của cô ấy tăng lên sau buổi đào tạo.',
  },
  {
    english: 'highly',
    partOfSpeech: 'adv.',
    vietnamese: 'rất, hết sức',
    ipaUk: '/ˈhaɪ.li/',
    ipaUs: '/ˈhaɪ.li/',
    related: 'very, extremely: rất, cực kỳ',
    example: 'The manager highly recommends this candidate.',
    exampleVi: 'Quản lý đánh giá rất cao ứng viên này.',
  },
  {
    english: 'professional',
    partOfSpeech: 'adj./n.',
    vietnamese: 'chuyên nghiệp, chuyên gia',
    ipaUk: '/prəˈfeʃ.ən.əl/',
    ipaUs: '/prəˈfeʃ.ən.əl/',
    related: 'expert, specialist: chuyên gia; professionally (adv.)',
    example: 'The team maintained a professional attitude during the interview.',
    exampleVi: 'Nhóm giữ thái độ chuyên nghiệp trong buổi phỏng vấn.',
  },
  {
    english: 'hire',
    partOfSpeech: 'v.',
    vietnamese: 'thuê, tuyển dụng',
    ipaUk: '/haɪər/',
    ipaUs: '/haɪr/',
    related: 'employ, recruit: tuyển dụng',
    example: 'The company plans to hire ten new employees.',
    exampleVi: 'Công ty dự định tuyển mười nhân viên mới.',
  },
  {
    english: 'reference',
    partOfSpeech: 'n.',
    vietnamese: 'sự giới thiệu, sự tham khảo',
    ipaUk: '/ˈref.ər.əns/',
    ipaUs: '/ˈref.ɚ.əns/',
    related: 'refer (v): tham khảo, xem; recommendation: lời giới thiệu',
    example: 'She spoke in very vague terms and there were no direct references to specific situations.',
    exampleVi: 'Cô ấy nói những thuật ngữ rất mơ hồ và không có sự đề cập trực tiếp đến các tình huống cụ thể.',
  },
  {
    english: 'position',
    partOfSpeech: 'n.',
    vietnamese: 'vị trí, chức vụ',
    ipaUk: '/pəˈzɪʃ.ən/',
    ipaUs: '/pəˈzɪʃ.ən/',
    related: 'post, job, role: vị trí, vai trò',
    example: 'The position requires three years of experience.',
    exampleVi: 'Vị trí này yêu cầu ba năm kinh nghiệm.',
  },
  {
    english: 'achievement',
    partOfSpeech: 'n.',
    vietnamese: 'thành tựu',
    ipaUk: '/əˈtʃiːv.mənt/',
    ipaUs: '/əˈtʃiːv.mənt/',
    related: 'accomplishment, attainment: thành tựu',
    example: 'Winning the award was a major achievement.',
    exampleVi: 'Giành giải thưởng là một thành tựu lớn.',
  },
  {
    english: 'impressed',
    partOfSpeech: 'adj.',
    vietnamese: 'ấn tượng',
    ipaUk: '/ɪmˈprest/',
    ipaUs: '/ɪmˈprest/',
    related: 'impress (v): gây ấn tượng; impressive (adj.)',
    example: 'The interviewer was impressed by her experience.',
    exampleVi: 'Người phỏng vấn ấn tượng với kinh nghiệm của cô ấy.',
  },
  {
    english: 'excellent',
    partOfSpeech: 'adj.',
    vietnamese: 'xuất sắc, tuyệt vời',
    ipaUk: '/ˈek.səl.ənt/',
    ipaUs: '/ˈek.səl.ənt/',
    related: 'outstanding, superb: xuất sắc',
    example: 'He has excellent communication skills.',
    exampleVi: 'Anh ấy có kỹ năng giao tiếp xuất sắc.',
  },
  {
    english: 'eligible',
    partOfSpeech: 'adj.',
    vietnamese: 'đủ điều kiện',
    ipaUk: '/ˈel.ɪ.dʒə.bəl/',
    ipaUs: '/ˈel.ə.dʒə.bəl/',
    related: 'qualified, entitled: đủ điều kiện',
    example: 'Only eligible employees can apply for the benefit.',
    exampleVi: 'Chỉ những nhân viên đủ điều kiện mới có thể đăng ký quyền lợi này.',
  },
  {
    english: 'identify',
    partOfSpeech: 'v.',
    vietnamese: 'xác định, nhận dạng',
    ipaUk: '/aɪˈden.tɪ.faɪ/',
    ipaUs: '/aɪˈden.t̬ə.faɪ/',
    related: 'recognize, determine: xác định, nhận ra',
    example: 'The recruiter identified three strong candidates.',
    exampleVi: 'Nhà tuyển dụng xác định được ba ứng viên mạnh.',
  },
  {
    english: 'associate',
    partOfSpeech: 'v./n.',
    vietnamese: 'liên kết, cộng tác; cộng sự',
    ipaUk: '/əˈsəʊ.si.eɪt/',
    ipaUs: '/əˈsoʊ.si.eɪt/',
    related: 'connect, partner: liên kết, cộng tác',
    example: 'Many people associate the brand with quality.',
    exampleVi: 'Nhiều người liên kết thương hiệu đó với chất lượng.',
  },
  {
    english: 'employment',
    partOfSpeech: 'n.',
    vietnamese: 'việc làm, sự tuyển dụng',
    ipaUk: '/ɪmˈplɔɪ.mənt/',
    ipaUs: '/ɪmˈplɔɪ.mənt/',
    related: 'job, work; employ (v): tuyển dụng',
    example: 'The agency helps people find employment.',
    exampleVi: 'Cơ quan này giúp mọi người tìm việc làm.',
  },
  {
    english: 'lack',
    partOfSpeech: 'v./n.',
    vietnamese: 'thiếu, sự thiếu hụt',
    ipaUk: '/læk/',
    ipaUs: '/læk/',
    related: 'shortage, be short of: thiếu hụt',
    example: 'He was rejected because of a lack of experience.',
    exampleVi: 'Anh ấy bị từ chối vì thiếu kinh nghiệm.',
  },
  {
    english: 'managerial',
    partOfSpeech: 'adj.',
    vietnamese: 'thuộc về quản lý',
    ipaUk: '/ˌmæn.əˈdʒɪə.ri.əl/',
    ipaUs: '/ˌmæn.əˈdʒɪr.i.əl/',
    related: 'supervisory, administrative: thuộc quản lý',
    example: 'The role requires managerial experience.',
    exampleVi: 'Vai trò này yêu cầu kinh nghiệm quản lý.',
  },
  {
    english: 'familiar',
    partOfSpeech: 'adj.',
    vietnamese: 'quen thuộc, thông thạo',
    ipaUk: '/fəˈmɪl.i.ər/',
    ipaUs: '/fəˈmɪl.jɚ/',
    related: 'acquainted, knowledgeable: quen thuộc, am hiểu',
    example: 'Applicants should be familiar with office software.',
    exampleVi: 'Ứng viên nên quen thuộc với phần mềm văn phòng.',
  },
  {
    english: 'prospective',
    partOfSpeech: 'adj.',
    vietnamese: 'tương lai, tiềm năng',
    ipaUk: '/prəˈspek.tɪv/',
    ipaUs: '/prəˈspek.tɪv/',
    related: 'potential, future: tiềm năng, tương lai',
    example: 'Prospective employees toured the office.',
    exampleVi: 'Các nhân viên tiềm năng đã tham quan văn phòng.',
  },
  {
    english: 'appeal',
    partOfSpeech: 'v./n.',
    vietnamese: 'hấp dẫn, thu hút; lời kêu gọi',
    ipaUk: '/əˈpiːl/',
    ipaUs: '/əˈpiːl/',
    related: 'attract, interest: thu hút, hấp dẫn',
    example: 'The benefits package appeals to many applicants.',
    exampleVi: 'Gói phúc lợi thu hút nhiều ứng viên.',
  },
  {
    english: 'specialize',
    partOfSpeech: 'v.',
    vietnamese: 'chuyên môn hóa',
    ipaUk: '/ˈspeʃ.əl.aɪz/',
    ipaUs: '/ˈspeʃ.əl.aɪz/',
    related: 'focus on, major in: chuyên về',
    example: 'The consultant specializes in recruitment.',
    exampleVi: 'Chuyên viên tư vấn chuyên về tuyển dụng.',
  },
  {
    english: 'apprehensive',
    partOfSpeech: 'adj.',
    vietnamese: 'lo lắng, e ngại',
    ipaUk: '/ˌæp.rɪˈhen.sɪv/',
    ipaUs: '/ˌæp.rəˈhen.sɪv/',
    related: 'anxious, worried: lo lắng',
    example: 'She felt apprehensive before the interview.',
    exampleVi: 'Cô ấy cảm thấy lo lắng trước buổi phỏng vấn.',
  },
  {
    english: 'consultant',
    partOfSpeech: 'n.',
    vietnamese: 'chuyên viên tư vấn',
    ipaUk: '/kənˈsʌl.tənt/',
    ipaUs: '/kənˈsʌl.tənt/',
    related: 'advisor, specialist: cố vấn, chuyên gia',
    example: 'The consultant reviewed the hiring process.',
    exampleVi: 'Chuyên viên tư vấn đã xem xét quy trình tuyển dụng.',
  },
  {
    english: 'entitle',
    partOfSpeech: 'v.',
    vietnamese: 'cho quyền, đặt tiêu đề',
    ipaUk: '/ɪnˈtaɪ.təl/',
    ipaUs: '/ɪnˈtaɪ.t̬əl/',
    related: 'qualify, authorize: cho quyền, đủ điều kiện',
    example: 'The certificate entitles employees to extra benefits.',
    exampleVi: 'Chứng chỉ cho nhân viên quyền nhận thêm phúc lợi.',
  },
  {
    english: 'certification',
    partOfSpeech: 'n.',
    vietnamese: 'giấy chứng nhận, sự chứng nhận',
    ipaUk: '/ˌsɜː.tɪ.fɪˈkeɪ.ʃən/',
    ipaUs: '/ˌsɝː.t̬ə.fəˈkeɪ.ʃən/',
    related: 'certificate, license: chứng chỉ, giấy phép',
    example: 'Certification is required for this occupation.',
    exampleVi: 'Chứng nhận là bắt buộc cho nghề này.',
  },
  {
    english: 'occupation',
    partOfSpeech: 'n.',
    vietnamese: 'nghề nghiệp',
    ipaUk: '/ˌɒk.jəˈpeɪ.ʃən/',
    ipaUs: '/ˌɑː.kjəˈpeɪ.ʃən/',
    related: 'job, profession: nghề nghiệp',
    example: 'Please write your current occupation on the form.',
    exampleVi: 'Vui lòng ghi nghề nghiệp hiện tại của bạn vào mẫu.',
  },
  {
    english: 'wage',
    partOfSpeech: 'n.',
    vietnamese: 'tiền lương',
    ipaUk: '/weɪdʒ/',
    ipaUs: '/weɪdʒ/',
    related: 'salary, pay: tiền lương',
    example: 'The company offers a competitive wage.',
    exampleVi: 'Công ty đưa ra mức lương cạnh tranh.',
  },
  {
    english: 'resume',
    partOfSpeech: 'n.',
    vietnamese: 'sơ yếu lý lịch, CV',
    ipaUk: '/ˈrez.juː.meɪ/',
    ipaUs: '/ˈrez.ə.meɪ/',
    related: 'CV, curriculum vitae: sơ yếu lý lịch',
    example: 'Attach your resume to the online application.',
    exampleVi: 'Đính kèm CV của bạn vào đơn ứng tuyển trực tuyến.',
  },
  {
    english: 'requirement',
    partOfSpeech: 'n.',
    vietnamese: 'yêu cầu, điều kiện',
    ipaUk: '/rɪˈkwaɪə.mənt/',
    ipaUs: '/rɪˈkwaɪr.mənt/',
    related: 'condition, prerequisite: yêu cầu, điều kiện tiên quyết',
    example: 'A college degree is a requirement for this job.',
    exampleVi: 'Bằng đại học là yêu cầu cho công việc này.',
  },
  {
    english: 'interview',
    partOfSpeech: 'n./v.',
    vietnamese: 'cuộc phỏng vấn, phỏng vấn',
    ipaUk: '/ˈɪn.tə.vjuː/',
    ipaUs: '/ˈɪn.t̬ɚ.vjuː/',
    related: 'meeting, conversation: buổi gặp, cuộc trao đổi',
    example: 'The interview will take place on Monday.',
    exampleVi: 'Buổi phỏng vấn sẽ diễn ra vào thứ Hai.',
  },
  {
    english: 'training',
    partOfSpeech: 'n.',
    vietnamese: 'đào tạo, huấn luyện',
    ipaUk: '/ˈtreɪ.nɪŋ/',
    ipaUs: '/ˈtreɪ.nɪŋ/',
    related: 'instruction, coaching: đào tạo, hướng dẫn',
    example: 'New employees receive two weeks of training.',
    exampleVi: 'Nhân viên mới được đào tạo trong hai tuần.',
  },
  {
    english: 'condition',
    partOfSpeech: 'n.',
    vietnamese: 'điều kiện',
    ipaUk: '/kənˈdɪʃ.ən/',
    ipaUs: '/kənˈdɪʃ.ən/',
    related: 'term, requirement: điều kiện, yêu cầu',
    example: 'Working conditions have improved this year.',
    exampleVi: 'Điều kiện làm việc đã cải thiện trong năm nay.',
  },
  {
    english: 'diligent',
    partOfSpeech: 'adj.',
    vietnamese: 'siêng năng, cần cù',
    ipaUk: '/ˈdɪl.ɪ.dʒənt/',
    ipaUs: '/ˈdɪl.ə.dʒənt/',
    related: 'hardworking, industrious: chăm chỉ',
    example: 'A diligent employee checks every detail.',
    exampleVi: 'Một nhân viên siêng năng kiểm tra mọi chi tiết.',
  },
  {
    english: 'proficiency',
    partOfSpeech: 'n.',
    vietnamese: 'sự thành thạo',
    ipaUk: '/prəˈfɪʃ.ən.si/',
    ipaUs: '/prəˈfɪʃ.ən.si/',
    related: 'skill, competence: kỹ năng, năng lực',
    example: 'The job requires proficiency in English.',
    exampleVi: 'Công việc yêu cầu sự thành thạo tiếng Anh.',
  },
  {
    english: 'degree',
    partOfSpeech: 'n.',
    vietnamese: 'bằng cấp, mức độ',
    ipaUk: '/dɪˈɡriː/',
    ipaUs: '/dɪˈɡriː/',
    related: 'diploma, qualification: bằng cấp, chứng chỉ',
    example: 'A degree in business is preferred.',
    exampleVi: 'Ưu tiên bằng cấp trong lĩnh vực kinh doanh.',
  },
  {
    english: 'payroll',
    partOfSpeech: 'n.',
    vietnamese: 'bảng lương',
    ipaUk: '/ˈpeɪ.rəʊl/',
    ipaUs: '/ˈpeɪ.roʊl/',
    related: 'salary list, wage list: danh sách lương',
    example: 'The payroll department processes salaries every month.',
    exampleVi: 'Phòng bảng lương xử lý tiền lương mỗi tháng.',
  },
  {
    english: 'recruit',
    partOfSpeech: 'v./n.',
    vietnamese: 'tuyển dụng; người mới được tuyển',
    ipaUk: '/rɪˈkruːt/',
    ipaUs: '/rɪˈkruːt/',
    related: 'hire, enlist: tuyển dụng',
    example: 'The company hopes to recruit more engineers.',
    exampleVi: 'Công ty hy vọng tuyển thêm kỹ sư.',
  },
];

const EXTRA_SEEDED_WORDS = EXTRA_SEEDED_TOPICS.flatMap((topic) => topic.words);
const SEEDED_TOPIC_WORDS_BY_ID = new Map([
  [SEEDED_TOPIC_ID, SEEDED_WORDS],
  ...EXTRA_SEEDED_TOPICS.map((topic) => [topic.id, topic.words]),
]);
const SEEDED_WORD_BY_ENGLISH = new Map([...SEEDED_WORDS, ...EXTRA_SEEDED_WORDS].map((word) => [word.english.toLowerCase(), word]));
const EMPTY_DRAFT = {
  english: '',
  partOfSpeech: '',
  vietnamese: '',
  ipaUs: '',
  related: '',
  example: '',
  exampleVi: '',
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getSeedWord(english, topicId = '', partOfSpeech = '') {
  const normalizedEnglish = clean(english).toLowerCase();
  const normalizedPartOfSpeech = clean(partOfSpeech).toLowerCase();
  const topicSeedWords = SEEDED_TOPIC_WORDS_BY_ID.get(topicId);

  if (topicSeedWords) {
    const exactSeed = topicSeedWords.find((word) => {
      const sameEnglish = clean(word.english).toLowerCase() === normalizedEnglish;
      const samePartOfSpeech = !normalizedPartOfSpeech || clean(word.partOfSpeech).toLowerCase() === normalizedPartOfSpeech;
      return sameEnglish && samePartOfSpeech;
    });

    if (exactSeed) return exactSeed;

    const matchingSeed = topicSeedWords.find((word) => clean(word.english).toLowerCase() === normalizedEnglish);
    if (matchingSeed) return matchingSeed;
  }

  return SEEDED_WORD_BY_ENGLISH.get(normalizedEnglish);
}

function createWord(seed, index, topicTitle = 'Recruitment', topicId = SEEDED_TOPIC_ID) {
  const ipaUk = seed.ipaUk || seed.ipaUs || seed.ipa || '';
  const ipaUs = seed.ipaUs || seed.ipaUk || seed.ipa || '';

  return {
    id: `${topicId}-${index + 1}`,
    topic: topicTitle,
    english: seed.english,
    partOfSpeech: seed.partOfSpeech,
    vietnamese: seed.vietnamese,
    ipa: ipaUs || ipaUk,
    ipaUk,
    ipaUs,
    related: seed.related || '',
    example: seed.example || '',
    exampleVi: seed.exampleVi || '',
    correctCount: 0,
    wrongCount: 0,
    needsReview: false,
    lastResult: '',
  };
}

function createSeedTopic(topic) {
  return {
    id: topic.id,
    title: topic.title,
    source: topic.source,
    reviewCount: 0,
    seedRestoreVersion: SEEDED_RESTORE_VERSION,
    words: topic.words.map((word, index) => createWord(word, index, topic.title, topic.id)),
  };
}

export function createDefaultVocabTopics() {
  return [
    {
      id: SEEDED_TOPIC_ID,
      title: 'Topic 1: Recruitment',
      source: 'topic 1.pdf',
      reviewCount: 0,
      seedRestoreVersion: SEEDED_RESTORE_VERSION,
      words: SEEDED_WORDS.map((word, index) => createWord(word, index, 'Topic 1: Recruitment')),
    },
    ...EXTRA_SEEDED_TOPICS.map(createSeedTopic),
  ];
}

export function normalizeVocabTopics(topics) {
  if (!Array.isArray(topics)) return [];

  return topics.map((topic) => {
    const title = clean(topic?.title) || 'Untitled topic';
    const id = String(topic?.id || uid());
    let seedRestoreVersion = numberValue(topic?.seedRestoreVersion);
    let words = Array.isArray(topic?.words)
      ? topic.words.map((word) => {
          const english = clean(word?.english);
          const seed = getSeedWord(english, id, word?.partOfSpeech || word?.type);
          const ipaUk = clean(word?.ipaUk || word?.ukIpa || word?.ipa) || seed?.ipaUk || '';
          const ipaUs = clean(word?.ipaUs || word?.usIpa) || seed?.ipaUs || ipaUk;

          return {
            id: String(word?.id || uid()),
            topic: clean(word?.topic) || title,
            english,
            partOfSpeech: clean(word?.partOfSpeech || word?.type) || seed?.partOfSpeech || '',
            vietnamese: clean(word?.vietnamese) || seed?.vietnamese || '',
            ipa: clean(word?.ipa) || ipaUs || ipaUk,
            ipaUk,
            ipaUs,
            related: clean(word?.related || word?.synonyms || word?.synonym) || seed?.related || '',
            example: clean(word?.example) || seed?.example || '',
            exampleVi: clean(word?.exampleVi || word?.translation) || seed?.exampleVi || '',
            correctCount: numberValue(word?.correctCount),
            wrongCount: numberValue(word?.wrongCount),
            needsReview: Boolean(word?.needsReview),
            lastResult: word?.lastResult === 'wrong' ? 'wrong' : word?.lastResult === 'correct' ? 'correct' : '',
          };
        })
      : [];

    if (id === SEEDED_TOPIC_ID && seedRestoreVersion < SEEDED_RESTORE_VERSION) {
      const existingWords = new Set(words.map((word) => clean(word.english).toLowerCase()).filter(Boolean));
      const missingSeedWords = SEEDED_WORDS
        .filter((word) => !existingWords.has(word.english.toLowerCase()))
        .map((word, index) => ({
          ...createWord(word, SEEDED_WORDS.findIndex((seed) => seed.english === word.english), title),
          id: `${SEEDED_TOPIC_ID}-restored-${index + 1}-${word.english}`,
        }));

      words = [...words, ...missingSeedWords];
      seedRestoreVersion = SEEDED_RESTORE_VERSION;
    }

    return {
      id,
      title,
      source: clean(topic?.source),
      reviewCount: numberValue(topic?.reviewCount),
      seedRestoreVersion,
      words,
    };
  });
}

export function getVocabStats(topics) {
  const normalized = normalizeVocabTopics(topics);
  const words = normalized.flatMap((topic) => topic.words).filter((word) => word.english && word.vietnamese);
  const learned = words.filter((word) => word.correctCount > 0 && !word.needsReview).length;
  const needsReview = words.filter((word) => word.needsReview).length;

  return {
    topics: normalized.length,
    total: words.length,
    learned,
    needsReview,
    reviewCount: normalized.reduce((sum, topic) => sum + numberValue(topic.reviewCount), 0),
  };
}

function learnedInTopic(topic) {
  return topic.words.filter((word) => word.english && word.vietnamese && word.correctCount > 0 && !word.needsReview).length;
}

function totalInTopic(topic) {
  return topic.words.filter((word) => word.english && word.vietnamese).length;
}

function answerText(word) {
  return word.vietnamese;
}

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function buildQuestions(topic, onlyWrong = false) {
  const allWords = topic.words.filter((word) => word.english && word.vietnamese);
  const selectedWords = onlyWrong ? allWords.filter((word) => word.needsReview) : allWords;
  const sourceWords = selectedWords.length ? selectedWords : allWords;

  if (allWords.length < 4) return [];

  return shuffle(sourceWords).map((word) => {
    const distractors = shuffle(allWords.filter((item) => item.id !== word.id)).slice(0, 3);
    const options = shuffle([
      { id: uid(), text: answerText(word), correct: true },
      ...distractors.map((item) => ({ id: uid(), text: answerText(item), correct: false })),
    ]);

    return {
      id: uid(),
      wordId: word.id,
      english: word.english,
      partOfSpeech: word.partOfSpeech,
      ipa: word.ipa,
      ipaUs: word.ipaUs,
      related: word.related,
      example: word.example,
      wasWrong: word.needsReview,
      options,
    };
  });
}

function speakWord(word) {
  if (!window.speechSynthesis || !word) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find((voice) => voice.lang === 'en-US' && /Jenny|Aria|Natural|Google|Microsoft/i.test(voice.name))
    || voices.find((voice) => voice.lang === 'en-US')
    || voices.find((voice) => voice.lang?.startsWith('en'));

  if (englishVoice) utterance.voice = englishVoice;
  utterance.lang = 'en-US';
  utterance.rate = 0.78;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function playTing() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const gain = context.createGain();
  const first = context.createOscillator();
  const second = context.createOscillator();
  const now = context.currentTime;

  first.frequency.value = 1046;
  second.frequency.value = 1568;
  first.type = 'triangle';
  second.type = 'triangle';
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  first.connect(gain);
  second.connect(gain);
  gain.connect(context.destination);
  first.start(now);
  second.start(now + 0.05);
  first.stop(now + 0.24);
  second.stop(now + 0.35);
  window.setTimeout(() => context.close().catch(() => {}), 450);
}

export default function Vocab({ topics, setTopics }) {
  const normalizedTopics = useMemo(() => normalizeVocabTopics(topics), [topics]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [quiz, setQuiz] = useState({
    status: 'idle',
    questions: [],
    index: 0,
    answers: {},
    lastScore: null,
  });

  useEffect(() => {
    if (JSON.stringify(topics || []) !== JSON.stringify(normalizedTopics)) {
      setTopics(normalizedTopics);
    }
  }, [normalizedTopics]);

  useEffect(() => {
    if (!normalizedTopics.length || !selectedTopicId) {
      setSelectedTopicId('');
      return;
    }
    if (!normalizedTopics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId('');
    }
  }, [normalizedTopics, selectedTopicId]);

  const selectedTopic = normalizedTopics.find((topic) => topic.id === selectedTopicId) || null;
  const topicTotal = selectedTopic ? totalInTopic(selectedTopic) : 0;
  const topicLearned = selectedTopic ? learnedInTopic(selectedTopic) : 0;
  const currentQuestion = quiz.status === 'active' ? quiz.questions[quiz.index] : null;
  const selectedAnswerId = currentQuestion ? quiz.answers[currentQuestion.id] : '';
  const stats = getVocabStats(normalizedTopics);

  useEffect(() => {
    if (autoSpeak && currentQuestion?.english) speakWord(currentQuestion.english);
  }, [autoSpeak, currentQuestion?.id]);

  function updateTopics(updater) {
    setTopics((current) => normalizeVocabTopics(updater(normalizeVocabTopics(current))));
  }

  function updateTopic(topicId, updater) {
    updateTopics((current) => current.map((topic) => (topic.id === topicId ? updater(topic) : topic)));
  }

  function updateWord(topicId, wordId, patch) {
    updateTopic(topicId, (topic) => ({
      ...topic,
      words: topic.words.map((word) => (word.id === wordId ? { ...word, ...patch } : word)),
    }));
  }

  function markAnswer(question, isCorrect) {
    if (!selectedTopic) return;
    updateWord(selectedTopic.id, question.wordId, isCorrect
      ? { correctCount: 1, needsReview: false, lastResult: 'correct' }
      : { wrongCount: 1, needsReview: true, lastResult: 'wrong' });
  }

  function answer(optionId) {
    if (!currentQuestion || selectedAnswerId) return;
    const option = currentQuestion.options.find((item) => item.id === optionId);
    setQuiz((current) => ({
      ...current,
      answers: { ...current.answers, [currentQuestion.id]: optionId },
    }));
    markAnswer(currentQuestion, Boolean(option?.correct));
    if (option?.correct) playTing();
  }

  function startQuiz(onlyWrong = false) {
    if (!selectedTopic) return;
    const questions = buildQuestions(selectedTopic, onlyWrong);
    if (!questions.length) {
      window.alert('Topic cần ít nhất 4 từ để tạo quiz 4 đáp án.');
      return;
    }

    setQuiz({
      status: 'active',
      questions,
      index: 0,
      answers: {},
      lastScore: null,
    });
  }

  function finishQuiz(nextQuiz, { onlyAnswered = false } = {}) {
    const scoredQuestions = onlyAnswered
      ? nextQuiz.questions.filter((question) => nextQuiz.answers[question.id])
      : nextQuiz.questions;
    const correct = scoredQuestions.reduce((sum, question) => {
      const answerId = nextQuiz.answers[question.id];
      const option = question.options.find((item) => item.id === answerId);
      return sum + (option?.correct ? 1 : 0);
    }, 0);
    const total = scoredQuestions.length;

    updateTopic(selectedTopic.id, (topic) => ({
      ...topic,
      reviewCount: numberValue(topic.reviewCount) + 1,
    }));
    setQuiz({ ...nextQuiz, status: 'done', lastScore: { correct, total, wrong: Math.max(0, total - correct), finishedEarly: onlyAnswered } });
  }

  function nextQuestion() {
    if (!selectedAnswerId) return;
    if (quiz.index >= quiz.questions.length - 1) {
              finishQuiz(quiz);
      return;
    }
    setQuiz((current) => ({ ...current, index: current.index + 1 }));
  }

  function addWord(event) {
    event.preventDefault();
    if (!selectedTopic || !draft.english.trim() || !draft.vietnamese.trim()) return;

    updateTopic(selectedTopic.id, (topic) => ({
      ...topic,
      words: [
        ...topic.words,
        {
          id: uid(),
          topic: topic.title,
          english: clean(draft.english),
          partOfSpeech: clean(draft.partOfSpeech),
          vietnamese: clean(draft.vietnamese),
          ipa: clean(draft.ipaUs),
          ipaUk: clean(draft.ipaUs),
          ipaUs: clean(draft.ipaUs),
          related: clean(draft.related),
          example: clean(draft.example),
          exampleVi: clean(draft.exampleVi),
          correctCount: 0,
          wrongCount: 0,
          needsReview: false,
          lastResult: '',
        },
      ],
    }));
    setDraft(EMPTY_DRAFT);
  }

  function deleteWord(wordId) {
    if (!selectedTopic) return;
    updateTopic(selectedTopic.id, (topic) => ({
      ...topic,
      words: topic.words.filter((word) => word.id !== wordId),
    }));
  }

  function editWord(wordId, key, value) {
    if (!selectedTopic) return;
    updateWord(selectedTopic.id, wordId, { [key]: value });
  }

  function resetProgress() {
    if (!selectedTopic || !window.confirm('Xóa tiến độ của topic này?')) return;
    updateTopic(selectedTopic.id, (topic) => ({
      ...topic,
      reviewCount: 0,
      words: topic.words.map((word) => ({
        ...word,
        correctCount: 0,
        wrongCount: 0,
        needsReview: false,
        lastResult: '',
      })),
    }));
    setQuiz({ status: 'idle', questions: [], index: 0, answers: {}, lastScore: null });
  }

  if (!selectedTopic) {
    return (
      <div className="vocab-topic-overview">
        <section className="panel vocab-topic-hero">
          <div className="panel-heading">
            <div>
              <h2>Vocab</h2>
              <span>{stats.learned}/1000 từ đã thuộc</span>
            </div>
          </div>
          <div className="vocab-summary-row">
            <article>
              <strong>{stats.topics}</strong>
              <span>Topic</span>
            </article>
            <article>
              <strong>{stats.total}</strong>
              <span>Tổng từ</span>
            </article>
            <article>
              <strong>{stats.needsReview}</strong>
              <span>Cần ôn</span>
            </article>
          </div>
        </section>

        <section className="vocab-topic-grid" aria-label="Danh sách topic vocab">
          {normalizedTopics.map((topic) => {
            const total = totalInTopic(topic);
            const learned = learnedInTopic(topic);
            const review = topic.words.filter((word) => word.needsReview).length;
            const progress = total ? Math.round((learned / total) * 100) : 0;

            return (
              <button
                key={topic.id}
                type="button"
                className="vocab-topic-card"
                onClick={() => {
                  setSelectedTopicId(topic.id);
                  setQuiz({ status: 'idle', questions: [], index: 0, answers: {}, lastScore: null });
                }}
              >
                <span>{topic.source || 'Vocab topic'}</span>
                <strong>{topic.title}</strong>
                <small>{learned}/{total} từ đã thuộc · {numberValue(topic.reviewCount)} lượt ôn</small>
                <div
                  className={`vocab-topic-progress ${progress >= 100 ? 'complete' : ''}`}
                  style={{ '--topic-progress': `${progress}%` }}
                >
                  <i />
                </div>
                <em>{review} từ cần ôn</em>
              </button>
            );
          })}
        </section>
      </div>
    );
  }

  if (quiz.status === 'active' && currentQuestion) {
    return (
      <div className="vocab-quiz-focus">
        <section className="panel vocab-quiz-panel">
          <div className="panel-heading">
            <div>
              <h2>{selectedTopic.title}</h2>
              <span>Câu {quiz.index + 1}/{quiz.questions.length} · {topicLearned}/{topicTotal} đã thuộc</span>
            </div>
            <button className="secondary-button" type="button" onClick={() => finishQuiz(quiz, { onlyAnswered: true })}>
              Kết thúc
            </button>
          </div>

          <div className="vocab-question">
            <div className="vocab-question-card">
              <div className="vocab-question-head">
                <div className="vocab-question-title">
                  <span className="vocab-question-label">Từ gốc</span>
                  <h3>
                    {currentQuestion.wasWrong && <i title="Từ từng trả lời sai">!</i>}
                    {currentQuestion.english}
                  </h3>
                  <div className="vocab-ipa-line">
                    {currentQuestion.partOfSpeech && <span>{currentQuestion.partOfSpeech}</span>}
                    <span>US {currentQuestion.ipaUs || currentQuestion.ipa || 'IPA chưa có'}</span>
                  </div>
                </div>
                <button className="icon-button" type="button" title="Nghe phát âm" onClick={() => speakWord(currentQuestion.english)}>
                  <Play size={16} />
                </button>
              </div>
              {currentQuestion.related && (
                <div className="vocab-related-card">
                  <strong>Từ đồng nghĩa / liên quan</strong>
                  <span>{currentQuestion.related}</span>
                </div>
              )}
              {currentQuestion.example && <p className="vocab-example-line">{currentQuestion.example}</p>}
              <div className="vocab-options">
                {currentQuestion.options.map((option) => {
                  const revealed = Boolean(selectedAnswerId);
                  const className = [
                    'vocab-option',
                    selectedAnswerId === option.id ? 'selected' : '',
                    revealed && selectedAnswerId === option.id && !option.correct ? 'wrong' : '',
                    revealed && option.correct ? 'correct' : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <button key={option.id} type="button" className={className} onClick={() => answer(option.id)}>
                      {option.text}
                    </button>
                  );
                })}
              </div>
              <button className="primary-button" type="button" disabled={!selectedAnswerId} onClick={nextQuestion}>
                {quiz.index >= quiz.questions.length - 1 ? 'Kết thúc' : 'Câu tiếp theo'}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="vocab-detail-page">
      <section className="panel vocab-editor-panel">
        <div className="panel-heading">
          <div>
            <button className="vocab-back-button" type="button" onClick={() => setSelectedTopicId('')}>
              ← Topic
            </button>
            <h2>{selectedTopic.title}</h2>
            <span>{topicLearned}/{topicTotal} đã thuộc · {numberValue(selectedTopic.reviewCount)} lượt ôn</span>
          </div>
          <button className="icon-button" type="button" title="Xóa tiến độ" onClick={resetProgress}>
            <RotateCcw size={17} />
          </button>
        </div>

        <div className="vocab-summary-row">
          <article>
            <strong>{topicTotal}</strong>
            <span>Tổng từ</span>
          </article>
          <article>
            <strong>{topicLearned}</strong>
            <span>Đã thuộc</span>
          </article>
          <article>
            <strong>{selectedTopic.words.filter((word) => word.needsReview).length}</strong>
            <span>Cần ôn</span>
          </article>
        </div>

        <form className="vocab-add-form" onSubmit={addWord}>
          <input value={draft.english} onChange={(event) => setDraft({ ...draft, english: event.target.value })} placeholder="English" />
          <input value={draft.partOfSpeech} onChange={(event) => setDraft({ ...draft, partOfSpeech: event.target.value })} placeholder="Dạng từ" />
          <input value={draft.ipaUs} onChange={(event) => setDraft({ ...draft, ipaUs: event.target.value })} placeholder="IPA US" />
          <input value={draft.vietnamese} onChange={(event) => setDraft({ ...draft, vietnamese: event.target.value })} placeholder="Nghĩa tiếng Việt" />
          <input value={draft.related} onChange={(event) => setDraft({ ...draft, related: event.target.value })} placeholder="Đồng nghĩa / liên quan" />
          <button className="primary-button" type="submit">
            <Plus size={17} />
            Thêm từ
          </button>
        </form>

        <div className="vocab-word-table">
          <div className="vocab-word-header">
            <span>English</span>
            <span>Dạng từ</span>
            <span>IPA US</span>
            <span>Nghĩa tiếng Việt</span>
            <span>Đồng nghĩa / liên quan</span>
            <span>Trạng thái</span>
            <span></span>
          </div>
          {selectedTopic.words.map((word) => (
            <div className="vocab-word-row" key={word.id}>
              <input value={word.english} onChange={(event) => editWord(word.id, 'english', event.target.value)} />
              <input value={word.partOfSpeech || ''} onChange={(event) => editWord(word.id, 'partOfSpeech', event.target.value)} placeholder="Dạng từ" />
              <input value={word.ipaUs || word.ipa || ''} onChange={(event) => editWord(word.id, 'ipaUs', event.target.value)} placeholder="IPA US" />
              <input value={word.vietnamese} onChange={(event) => editWord(word.id, 'vietnamese', event.target.value)} />
              <input value={word.related || ''} onChange={(event) => editWord(word.id, 'related', event.target.value)} placeholder="Đồng nghĩa / liên quan" />
              <span className={`vocab-status ${word.needsReview ? 'review' : word.correctCount > 0 ? 'known' : ''}`}>
                {word.needsReview ? 'Cần ôn' : word.correctCount > 0 ? 'Đã thuộc' : 'Mới'}
              </span>
              <div className="vocab-row-actions">
                <button className="icon-button" type="button" title="Nghe phát âm" onClick={() => speakWord(word.english)}>
                  <Volume2 size={16} />
                </button>
                <button className="icon-button danger" type="button" title="Xóa từ" onClick={() => deleteWord(word.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel vocab-quiz-panel">
        <div className="panel-heading">
          <div>
            <h2>Quiz</h2>
            <span>{topicLearned}/{topicTotal} đã thuộc</span>
          </div>
          <label className="vocab-toggle">
            <input type="checkbox" checked={autoSpeak} onChange={(event) => setAutoSpeak(event.target.checked)} />
            <span>Tự phát âm</span>
          </label>
        </div>

        {quiz.status === 'done' && quiz.lastScore ? (
          <div className="vocab-result">
            <CheckCircle2 size={34} />
            <strong>{quiz.lastScore.correct}/{quiz.lastScore.total}</strong>
            <span>{quiz.lastScore.wrong || 0} câu sai · {quiz.lastScore.finishedEarly ? 'Kết thúc sớm' : 'Hoàn thành'} · {topicLearned}/{topicTotal} từ đã thuộc</span>
            <div className="vocab-result-actions">
              <button className="secondary-button" type="button" onClick={() => startQuiz(true)}>
                <AlertCircle size={17} />
                Làm lại câu sai
              </button>
              <button className="primary-button" type="button" onClick={() => startQuiz(false)}>
                <BookOpen size={17} />
                Làm lại toàn bộ
              </button>
            </div>
          </div>
        ) : (
          <div className="vocab-start">
            <BookOpen size={34} />
            <strong>{topicLearned}/{topicTotal}</strong>
            <span>Đã thuộc trong topic này</span>
            <button className="primary-button" type="button" onClick={() => startQuiz(false)}>
              <BookOpen size={17} />
              Bắt đầu quiz
            </button>
            <button className="secondary-button" type="button" onClick={() => startQuiz(true)} disabled={!selectedTopic.words.some((word) => word.needsReview)}>
              <AlertCircle size={17} />
              Ôn câu sai
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyVocabState() {
  return (
    <div className="empty-state">
      <BookOpen size={28} />
      <strong>Chưa có topic vocab</strong>
    </div>
  );
}
