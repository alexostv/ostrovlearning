/* =====================================================
   exercises.js — рендеринг и проверка упражнений
   Поддерживаются типы: multiple-choice, fill-blank, matching
   ===================================================== */

function renderExercise(moduleId, exercise, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'exercise';
  wrapper.dataset.exerciseId = exercise.id;

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-3';
  header.innerHTML = `
    <span class="badge badge-level">Упражнение ${index + 1}</span>
    <span class="text-xs text-gray-400">${escapeHtml(exercise.type)}</span>
  `;
  wrapper.appendChild(header);

  if (exercise.question) {
    const q = document.createElement('div');
    q.className = 'exercise-question';
    q.textContent = exercise.question;
    wrapper.appendChild(q);
  }

  let body;
  switch (exercise.type) {
    case 'multiple-choice':
      body = renderMultipleChoice(moduleId, exercise);
      break;
    case 'fill-blank':
      body = renderFillBlank(moduleId, exercise);
      break;
    case 'matching':
      body = renderMatching(moduleId, exercise);
      break;
    default:
      body = document.createElement('div');
      body.textContent = `Неизвестный тип упражнения: ${exercise.type}`;
      body.className = 'text-red-600';
  }

  wrapper.appendChild(body);
  return wrapper;
}

/* =====================================================
   1. Multiple Choice (тест с выбором ответа)
   Формат вариантов:
   Новый: options = [{text, correct}, ...]
   Старый: options = [string, ...] + correct = [индексы]
   ===================================================== */

function normalizeMultipleChoice(exercise) {
  const rawOptions = exercise.options || [];
  // Новый формат: массив объектов с полями text/correct
  if (rawOptions.length > 0 && typeof rawOptions[0] === 'object' && !Array.isArray(rawOptions[0])) {
    return rawOptions.map(o => ({ text: o.text || '', correct: !!o.correct }));
  }
  // Старый формат: массив строк + отдельное поле correct с индексами
  const correctSet = new Set(exercise.correct || []);
  return rawOptions.map((text, i) => ({ text: String(text), correct: correctSet.has(i) }));
}

function renderMultipleChoice(moduleId, exercise) {
  const container = document.createElement('div');
  const options = normalizeMultipleChoice(exercise);
  // multiple = true если несколько правильных или явно указано
  const correctCount = options.filter(o => o.correct).length;
  const isMultiple = !!exercise.multiple || correctCount > 1;
  const inputType = isMultiple ? 'checkbox' : 'radio';
  const groupName = `mc-${moduleId}-${exercise.id}`;

  const optionsList = document.createElement('div');
  options.forEach((opt, i) => {
    const label = document.createElement('label');
    label.className = 'choice-option';
    label.innerHTML = `
      <input type="${inputType}" name="${groupName}" value="${i}">
      <span>${escapeHtml(opt.text)}</span>
    `;
    label.addEventListener('click', () => {
      setTimeout(() => updateChoiceVisual(optionsList), 0);
    });
    optionsList.appendChild(label);
  });
  container.appendChild(optionsList);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'btn-primary mt-3';
  checkBtn.textContent = 'Проверить';
  container.appendChild(checkBtn);

  const feedback = document.createElement('div');
  container.appendChild(feedback);

  checkBtn.addEventListener('click', () => {
    const selected = Array.from(optionsList.querySelectorAll('input:checked')).map(i => parseInt(i.value, 10));
    if (selected.length === 0) {
      feedback.className = 'feedback incorrect';
      feedback.textContent = 'Выбери хотя бы один вариант.';
      return;
    }

    const correctIndices = options.map((o, i) => o.correct ? i : -1).filter(i => i >= 0);
    const correctSet = new Set(correctIndices);
    const selectedSet = new Set(selected);
    const isCorrect = correctSet.size === selectedSet.size &&
      [...correctSet].every(x => selectedSet.has(x));

    optionsList.querySelectorAll('.choice-option').forEach((label, i) => {
      label.classList.remove('selected', 'correct', 'incorrect');
      if (correctSet.has(i)) label.classList.add('correct');
      else if (selectedSet.has(i)) label.classList.add('incorrect');
      label.querySelector('input').disabled = true;
    });

    showFeedback(feedback, isCorrect, exercise.explanation);
    recordExerciseResult(moduleId, exercise.id, isCorrect);
    checkBtn.disabled = true;
    notifyExerciseDone(container, isCorrect);
  });

  return container;
}

function updateChoiceVisual(container) {
  container.querySelectorAll('.choice-option').forEach(label => {
    const input = label.querySelector('input');
    label.classList.toggle('selected', input.checked);
  });
}

/* =====================================================
   2. Fill in the Blank (заполнение пропусков)
   ===================================================== */

function renderFillBlank(moduleId, exercise) {
  const container = document.createElement('div');

  const sentenceDiv = document.createElement('div');
  sentenceDiv.className = 'exercise-sentence';

  const sentence = exercise.sentence || '';
  const parts = sentence.split('___');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fill-input';
  input.autocomplete = 'off';
  input.spellcheck = false;

  if (parts.length >= 2) {
    sentenceDiv.appendChild(document.createTextNode(parts[0]));
    sentenceDiv.appendChild(input);
    for (let i = 1; i < parts.length; i++) {
      sentenceDiv.appendChild(document.createTextNode(parts[i]));
      if (i < parts.length - 1) break;
    }
  } else {
    sentenceDiv.textContent = sentence;
    sentenceDiv.appendChild(input);
  }
  container.appendChild(sentenceDiv);

  if (exercise.hint) {
    const hint = document.createElement('div');
    hint.className = 'text-sm text-gray-500 italic mb-2';
    hint.textContent = `Подсказка: ${exercise.hint}`;
    container.appendChild(hint);
  }

  const checkBtn = document.createElement('button');
  checkBtn.className = 'btn-primary mt-2';
  checkBtn.textContent = 'Проверить';
  container.appendChild(checkBtn);

  const feedback = document.createElement('div');
  container.appendChild(feedback);

  function check() {
    const value = input.value.trim();
    if (!value) {
      feedback.className = 'feedback incorrect';
      feedback.textContent = 'Введи ответ.';
      return;
    }
    const answers = (exercise.answers || []).map(a => a.toString());
    const isCorrect = exercise.case_sensitive
      ? answers.includes(value)
      : answers.some(a => a.toLowerCase() === value.toLowerCase());

    input.classList.remove('correct', 'incorrect');
    input.classList.add(isCorrect ? 'correct' : 'incorrect');
    input.disabled = true;
    checkBtn.disabled = true;

    if (!isCorrect && answers.length > 0) {
      const right = document.createElement('div');
      right.className = 'text-sm text-gray-600 mt-2';
      right.innerHTML = `Правильный ответ: <strong>${escapeHtml(answers[0])}</strong>`;
      container.insertBefore(right, feedback);
    }

    showFeedback(feedback, isCorrect, exercise.explanation);
    recordExerciseResult(moduleId, exercise.id, isCorrect);
    notifyExerciseDone(container, isCorrect);
  }

  checkBtn.addEventListener('click', check);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });

  return container;
}

/* =====================================================
   3. Matching (сопоставление пар)
   Формат пар:
   Новый: pairs = [{left, right}, ...] (для CMS-редактирования)
   Старый: left = [строки], right = [строки], pairs = [[i,j], ...]
   ===================================================== */

function normalizeMatching(exercise) {
  // Новый формат: pairs - массив объектов {left, right}
  if (Array.isArray(exercise.pairs) && exercise.pairs.length > 0 &&
      typeof exercise.pairs[0] === 'object' && !Array.isArray(exercise.pairs[0])) {
    const left = exercise.pairs.map(p => p.left || '');
    const right = exercise.pairs.map(p => p.right || '');
    const pairs = exercise.pairs.map((_, i) => [i, i]);
    return { left, right, pairs };
  }
  // Старый формат
  return {
    left: exercise.left || [],
    right: exercise.right || [],
    pairs: exercise.pairs || [],
  };
}

function renderMatching(moduleId, exercise) {
  const container = document.createElement('div');
  const { left: leftItems, right: rightItems, pairs: correctPairs } = normalizeMatching(exercise);

  const grid = document.createElement('div');
  grid.className = 'matching-container';

  // Перемешаем правую колонку
  const rightOrder = rightItems.map((_, i) => i);
  shuffleArray(rightOrder);

  const leftColumn = document.createElement('div');
  const rightColumn = document.createElement('div');
  leftColumn.className = 'space-y-2';
  rightColumn.className = 'space-y-2';

  const state = {
    selectedLeft: null,
    selectedRight: null,
    matches: [],
    pairLabels: 0,
  };

  leftItems.forEach((text, i) => {
    const item = document.createElement('div');
    item.className = 'matching-item';
    item.dataset.side = 'left';
    item.dataset.index = i;
    item.innerHTML = `<span class="matching-text">${escapeHtml(text)}</span>`;
    item.addEventListener('click', () => onMatchClick(item, 'left', i));
    leftColumn.appendChild(item);
  });

  rightOrder.forEach((origIndex) => {
    const text = rightItems[origIndex];
    const item = document.createElement('div');
    item.className = 'matching-item';
    item.dataset.side = 'right';
    item.dataset.index = origIndex;
    item.innerHTML = `<span class="matching-text">${escapeHtml(text)}</span>`;
    item.addEventListener('click', () => onMatchClick(item, 'right', origIndex));
    rightColumn.appendChild(item);
  });

  grid.appendChild(leftColumn);
  grid.appendChild(rightColumn);

  const hint = document.createElement('div');
  hint.className = 'text-sm text-gray-500 italic mb-2';
  hint.textContent = 'Кликай по элементам слева и справа, чтобы соединять их в пары.';
  container.appendChild(hint);
  container.appendChild(grid);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'btn-primary mt-3';
  checkBtn.textContent = 'Проверить';
  checkBtn.disabled = true;
  container.appendChild(checkBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-secondary mt-3 ml-2';
  resetBtn.textContent = 'Сбросить';
  container.appendChild(resetBtn);

  const feedback = document.createElement('div');
  container.appendChild(feedback);

  function onMatchClick(item, side, index) {
    if (item.classList.contains('matched')) return;
    if (checkBtn.disabled === true && state.matches.length === leftItems.length) return;

    if (side === 'left') {
      leftColumn.querySelectorAll('.matching-item.selected').forEach(el => el.classList.remove('selected'));
      state.selectedLeft = { item, index };
      item.classList.add('selected');
    } else {
      rightColumn.querySelectorAll('.matching-item.selected').forEach(el => el.classList.remove('selected'));
      state.selectedRight = { item, index };
      item.classList.add('selected');
    }

    if (state.selectedLeft && state.selectedRight) {
      const leftItem = state.selectedLeft.item;
      const rightItem = state.selectedRight.item;
      const leftIdx = state.selectedLeft.index;
      const rightIdx = state.selectedRight.index;
      state.pairLabels += 1;
      const label = state.pairLabels;

      leftItem.classList.remove('selected');
      rightItem.classList.remove('selected');
      leftItem.classList.add('matched');
      rightItem.classList.add('matched');

      const labelEl1 = document.createElement('span');
      labelEl1.className = 'matching-pair-label';
      labelEl1.textContent = `#${label}`;
      leftItem.appendChild(labelEl1);

      const labelEl2 = document.createElement('span');
      labelEl2.className = 'matching-pair-label';
      labelEl2.textContent = `#${label}`;
      rightItem.appendChild(labelEl2);

      state.matches.push([leftIdx, rightIdx]);
      state.selectedLeft = null;
      state.selectedRight = null;

      if (state.matches.length === leftItems.length) {
        checkBtn.disabled = false;
      }
    }
  }

  resetBtn.addEventListener('click', () => {
    [...leftColumn.children, ...rightColumn.children].forEach(item => {
      item.classList.remove('matched', 'matched-correct', 'matched-incorrect', 'selected');
      item.querySelectorAll('.matching-pair-label').forEach(l => l.remove());
    });
    state.matches = [];
    state.pairLabels = 0;
    state.selectedLeft = null;
    state.selectedRight = null;
    checkBtn.disabled = true;
    feedback.className = '';
    feedback.textContent = '';
  });

  checkBtn.addEventListener('click', () => {
    const correctMap = new Map(correctPairs.map(([l, r]) => [l, r]));
    let allCorrect = true;

    state.matches.forEach(([leftIdx, rightIdx]) => {
      const leftEl = leftColumn.querySelector(`[data-side="left"][data-index="${leftIdx}"]`);
      const rightEl = rightColumn.querySelector(`[data-side="right"][data-index="${rightIdx}"]`);
      const expected = correctMap.get(leftIdx);
      const correct = expected === rightIdx;
      if (!correct) allCorrect = false;
      leftEl.classList.add(correct ? 'matched-correct' : 'matched-incorrect');
      rightEl.classList.add(correct ? 'matched-correct' : 'matched-incorrect');
    });

    showFeedback(feedback, allCorrect, exercise.explanation);
    recordExerciseResult(moduleId, exercise.id, allCorrect);
    checkBtn.disabled = true;
    resetBtn.disabled = true;
    notifyExerciseDone(container, allCorrect);
  });

  return container;
}

/* --- Утилиты --- */

function showFeedback(el, isCorrect, explanation) {
  el.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  const main = isCorrect ? 'Правильно!' : 'Неправильно.';
  let html = `<div>${main}</div>`;
  if (explanation) {
    html += `<div class="feedback-explanation">${escapeHtml(explanation)}</div>`;
  }
  el.innerHTML = html;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function notifyExerciseDone(container, isCorrect) {
  container.dispatchEvent(new CustomEvent('exercise-completed', {
    bubbles: true,
    detail: { isCorrect },
  }));
}
