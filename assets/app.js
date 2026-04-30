/* =====================================================
   app.js — общая логика сайта
   ===================================================== */

const STORAGE_KEY = 'es_course_progress_v1';

/* --- Утилиты для работы с прогрессом в localStorage --- */

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { modules: {} };
  } catch (e) {
    console.warn('Не удалось прочитать прогресс из localStorage', e);
    return { modules: {} };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Не удалось сохранить прогресс в localStorage', e);
  }
}

function getModuleProgress(moduleId) {
  const progress = loadProgress();
  return progress.modules[moduleId] || { exercises: {}, completed: false };
}

function recordExerciseResult(moduleId, exerciseId, isCorrect) {
  const progress = loadProgress();
  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = { exercises: {}, completed: false };
  }
  const mod = progress.modules[moduleId];
  if (!mod.exercises[exerciseId]) {
    mod.exercises[exerciseId] = { attempts: 0, correct: false, firstTryCorrect: false };
  }
  const ex = mod.exercises[exerciseId];
  ex.attempts += 1;
  if (isCorrect) {
    if (ex.attempts === 1) ex.firstTryCorrect = true;
    ex.correct = true;
  }
  saveProgress(progress);
}

function markModuleCompleted(moduleId) {
  const progress = loadProgress();
  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = { exercises: {}, completed: false };
  }
  progress.modules[moduleId].completed = true;
  progress.modules[moduleId].completedAt = new Date().toISOString();
  saveProgress(progress);
}

function calculateModuleProgress(moduleData) {
  if (!moduleData || !moduleData.exercises || moduleData.exercises.length === 0) {
    return { percent: 0, done: 0, total: 0 };
  }
  const modProgress = getModuleProgress(moduleData.id);
  const total = moduleData.exercises.length;
  let done = 0;
  for (const ex of moduleData.exercises) {
    const exProgress = modProgress.exercises[ex.id];
    if (exProgress && exProgress.correct) done += 1;
  }
  return {
    percent: Math.round((done / total) * 100),
    done,
    total,
    completed: modProgress.completed,
  };
}

function resetAllProgress() {
  if (confirm('Сбросить весь прогресс? Это действие нельзя отменить.')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

/* --- Загрузка контента --- */

async function loadCourse() {
  const response = await fetch('content/courses.json');
  if (!response.ok) {
    throw new Error('Не удалось загрузить content/courses.json');
  }
  return response.json();
}

async function loadModule(moduleId) {
  const response = await fetch(`content/modules/${moduleId}.json`);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить модуль ${moduleId}`);
  }
  return response.json();
}

/* --- Утилиты URL --- */

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

/* --- Экранирование HTML (защита от XSS в пользовательском контенте) --- */

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/* --- Рендеринг блоков теории --- */

function renderTheory(theoryBlocks) {
  if (!Array.isArray(theoryBlocks)) return '';
  return theoryBlocks.map(renderTheoryBlock).join('');
}

function renderTheoryBlock(block) {
  if (!block || !block.type) return '';
  switch (block.type) {
    case 'paragraph':
      return `<p>${escapeHtml(block.text)}</p>`;

    case 'heading':
      return `<h2>${escapeHtml(block.text)}</h2>`;

    case 'list': {
      const items = (block.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    case 'table': {
      const headers = (block.headers || []).map(h => `<th>${escapeHtml(h)}</th>`).join('');
      const rows = (block.rows || []).map(row => {
        const cells = row.map(c => `<td>${escapeHtml(c)}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }

    case 'callout': {
      const variant = ['tip', 'warning', 'info'].includes(block.variant) ? block.variant : 'info';
      return `<div class="callout callout-${variant}">${escapeHtml(block.text)}</div>`;
    }

    case 'image': {
      const caption = block.caption ? `<div class="image-caption">${escapeHtml(block.caption)}</div>` : '';
      return `<div class="image-block"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || '')}">${caption}</div>`;
    }

    case 'audio': {
      const caption = block.caption ? `<div class="text-sm text-gray-500 mb-2">${escapeHtml(block.caption)}</div>` : '';
      return `<div class="audio-block">${caption}<audio controls src="${escapeHtml(block.src)}"></audio></div>`;
    }

    default:
      console.warn('Неизвестный тип блока теории:', block.type);
      return '';
  }
}

/* --- Отображение ошибок --- */

function showError(container, message) {
  container.innerHTML = `
    <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
      <p class="font-semibold text-red-800">Ошибка</p>
      <p class="text-red-700 mt-1">${escapeHtml(message)}</p>
      <p class="text-sm text-red-600 mt-2">Подробности в консоли браузера (F12).</p>
    </div>
  `;
}
