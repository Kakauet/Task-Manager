/* app.js - Código completo modificado con retardo para el arrastre en móviles */
const TaskModule = (function() {
  const COLUMN_STATES = { TODO: 'por-hacer', MY_DAY: 'mi-dia', DONE: 'hechas' };
  const AVAILABLE_THEMES = ['dark', 'light', 'blue', 'green', 'red', 'purple'];
  let tareas = [];
  let tempSteps = [];
  let picker = null;
  let searchTerm = "";
  let searchDebounceTimer = null;
  let undoStack = [];
  let redoStack = [];

  // Referencias DOM
  const themeToggleBtn = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const btnNuevaTarea = document.getElementById('btnNuevaTarea');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.querySelector('.modal-content .close');
  const modalTitle = document.getElementById('modal-title');
  const taskForm = document.getElementById('taskForm');
  const btnEliminar = document.getElementById('btnEliminar');
  const inputTaskId = document.getElementById('taskId');
  const inputTitulo = document.getElementById('titulo');
  const inputDescripcion = document.getElementById('descripcion');
  const stepsContainer = document.getElementById('stepsContainer');
  const btnAddStep = document.getElementById('btnAddStep');
  const searchInput = document.getElementById('searchInput');
  const btnToggleCalendar = document.getElementById('btnToggleCalendar');
  const calendarModal = document.getElementById('calendarModal');

  // Funciones de Undo/Redo
  function saveState() {
    undoStack.push(JSON.parse(JSON.stringify(tareas)));
    redoStack = [];
  }
  function undo() {
    if (undoStack.length > 0) {
      redoStack.push(JSON.parse(JSON.stringify(tareas)));
      tareas = undoStack.pop();
      guardarTareas();
      renderTareas();
    }
  }
  function redo() {
    if (redoStack.length > 0) {
      undoStack.push(JSON.parse(JSON.stringify(tareas)));
      tareas = redoStack.pop();
      guardarTareas();
      renderTareas();
    }
  }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      redo();
    }
  });

  // Utilidades
  function generarID() { return '_' + Math.random().toString(36).substr(2, 9); }
  function sanitizeInput(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
  function formatearFechaISO(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  function formatearFecha(fechaStr) {
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Gestión de tema
  function cargarTema() {
    const savedTheme = localStorage.getItem('theme');
    const themeToLoad = savedTheme && AVAILABLE_THEMES.includes(savedTheme)
      ? savedTheme
      : 'dark';
    document.documentElement.setAttribute('data-theme', themeToLoad);
    actualizarIconoTema(themeToLoad);
  }
  function guardarTema(theme) {
    localStorage.setItem('theme', theme);
  }
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let index = AVAILABLE_THEMES.indexOf(currentTheme);
    index = (index + 1) % AVAILABLE_THEMES.length;
    const newTheme = AVAILABLE_THEMES[index];
    document.documentElement.setAttribute('data-theme', newTheme);
    guardarTema(newTheme);
    actualizarIconoTema(newTheme);
  }
  function actualizarIconoTema(theme) {
    if (theme === 'dark') {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    } else {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  }

  // Gestión del modal de tareas
  function abrirModal(editar = false, tarea = {}) {
    modal.classList.add('active');
    if (editar) {
      modalTitle.textContent = 'Editar Tarea';
      inputTaskId.value = tarea.id;
      inputTitulo.value = tarea.titulo;
      inputDescripcion.value = tarea.descripcion || '';
      btnEliminar.style.display = 'inline-block';
      renderStepsInModal(tarea);
      if (tarea.vencimiento) {
        picker.setDate(tarea.vencimiento, true, "Y-m-d");
      } else {
        picker.clear();
      }
    } else {
      modalTitle.textContent = 'Nueva Tarea';
      inputTaskId.value = '';
      inputTitulo.value = '';
      inputDescripcion.value = '';
      btnEliminar.style.display = 'none';
      tempSteps = [];
      renderStepsInModal({ pasos: tempSteps });
      picker.clear();
    }
  }
  function cerrarModal() {
    modal.classList.remove('active');
  }
  closeModalBtn.addEventListener('click', cerrarModal);

  // Gestión de pasos
  function renderStepsInModal(tarea) {
    stepsContainer.innerHTML = '';
    const pasos = tarea.pasos || tempSteps || [];
    pasos.forEach(step => {
      const stepDiv = document.createElement('div');
      stepDiv.classList.add('step-item');
      stepDiv.setAttribute('data-id', step.id);
      stepDiv.setAttribute('draggable', 'true');

      const checkIcon = document.createElement('i');
      checkIcon.className = step.completado
        ? 'check-icon fa-solid fa-circle-check'
        : 'check-icon fa-regular fa-circle';

      const btnDeleteStep = document.createElement('button');
      btnDeleteStep.classList.add('btn-step-delete');
      btnDeleteStep.innerHTML = '<i class="fa-solid fa-trash"></i>';

      const stepInput = document.createElement('input');
      stepInput.type = 'text';
      stepInput.value = step.texto;

      stepDiv.appendChild(checkIcon);
      stepDiv.appendChild(stepInput);
      stepDiv.appendChild(btnDeleteStep);
      stepsContainer.appendChild(stepDiv);
    });
  }
  stepsContainer.addEventListener('click', (e) => {
    const stepItem = e.target.closest('.step-item');
    if (!stepItem) return;
    const stepId = stepItem.getAttribute('data-id');
    let pasos = inputTaskId.value
      ? tareas.find(t => t.id === inputTaskId.value)?.pasos
      : tempSteps;
    if (!pasos) return;
    const step = pasos.find(s => s.id === stepId);
    if (!step) return;

    if (e.target.classList.contains('check-icon') || e.target.closest('.check-icon')) {
      step.completado = !step.completado;
      guardarTareas();
      renderTareas();
      renderStepsInModal({ pasos });
    }
    else if (e.target.closest('.btn-step-delete')) {
      saveState();
      if (inputTaskId.value) {
        let tarea = tareas.find(t => t.id === inputTaskId.value);
        if (tarea) {
          tarea.pasos = tarea.pasos.filter(s => s.id !== stepId);
          guardarTareas();
          renderStepsInModal(tarea);
          renderTareas();
        }
      } else {
        tempSteps = tempSteps.filter(s => s.id !== stepId);
        renderStepsInModal({ pasos: tempSteps });
      }
    }
  });

  // Drag & Drop para pasos (sin cambios)
  stepsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingStep = document.querySelector('.step-item.dragging');
    if (!draggingStep) return;
    const afterElement = getDragAfterStep(stepsContainer, e.clientY);
    if (!afterElement) {
      stepsContainer.appendChild(draggingStep);
    } else {
      stepsContainer.insertBefore(draggingStep, afterElement);
    }
  });
  function getDragAfterStep(container, y) {
    const draggableSteps = [...container.querySelectorAll('.step-item:not(.dragging)')];
    return draggableSteps.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  stepsContainer.addEventListener('dragstart', (e) => {
    const stepItem = e.target.closest('.step-item');
    if (stepItem) stepItem.classList.add('dragging');
  });
  stepsContainer.addEventListener('dragend', (e) => {
    const stepItem = e.target.closest('.step-item');
    if (stepItem) {
      stepItem.classList.remove('dragging');
      updateStepsOrder();
    }
  });
  function updateStepsOrder() {
    const stepElements = stepsContainer.querySelectorAll('.step-item');
    const newOrderIds = Array.from(stepElements).map(el => el.getAttribute('data-id'));
    if (inputTaskId.value) {
      let tarea = tareas.find(t => t.id === inputTaskId.value);
      if (tarea && tarea.pasos) {
        tarea.pasos.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
        guardarTareas();
        renderStepsInModal(tarea);
      }
    } else {
      tempSteps.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
      renderStepsInModal({ pasos: tempSteps });
    }
  }
  btnAddStep.addEventListener('click', () => {
    saveState();
    const nuevoPaso = { id: generarID(), texto: '', completado: false };
    if (inputTaskId.value) {
      let tarea = tareas.find(t => t.id === inputTaskId.value);
      if (!tarea.pasos) tarea.pasos = [];
      tarea.pasos.push(nuevoPaso);
      guardarTareas();
      renderStepsInModal(tarea);
    } else {
      tempSteps.push(nuevoPaso);
      renderStepsInModal({ pasos: tempSteps });
    }
  });

  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    saveState();
    const id = inputTaskId.value;
    const titulo = sanitizeInput(inputTitulo.value.trim());
    const descripcion = sanitizeInput(inputDescripcion.value.trim());
    const vencimiento = picker.selectedDates[0] ? formatearFechaISO(picker.selectedDates[0]) : '';
    if (id) {
      const index = tareas.findIndex(t => t.id === id);
      if (index !== -1) {
        tareas[index].titulo = titulo;
        tareas[index].descripcion = descripcion;
        tareas[index].vencimiento = vencimiento;
      }
    } else {
      const orden = tareas.filter(t => t.estado === COLUMN_STATES.TODO).length;
      const nuevaTarea = {
        id: generarID(),
        titulo,
        descripcion,
        estado: COLUMN_STATES.TODO,
        orden,
        pasos: tempSteps,
        vencimiento
      };
      tareas.push(nuevaTarea);
    }
    guardarTareas();
    renderTareas();
    cerrarModal();
  });
  btnEliminar.addEventListener('click', () => {
    if (!confirm('¿Seguro de eliminar esta tarea?')) return;
    saveState();
    const id = inputTaskId.value;
    tareas = tareas.filter(t => t.id !== id);
    guardarTareas();
    renderTareas();
    cerrarModal();
  });

  function guardarTareas() {
    try {
      localStorage.setItem('tareas', JSON.stringify(tareas));
    } catch (err) {
      console.error('Error al guardar tareas en localStorage', err);
    }
  }
  function cargarTareas() {
    const data = localStorage.getItem('tareas');
    if (data) tareas = JSON.parse(data);
  }

  function renderTareas() {
    const columnas = document.querySelectorAll('.contenedor-tareas');
    columnas.forEach(col => {
      const estado = col.dataset.columna;
      col.innerHTML = '';
      const tasksInColumn = tareas.filter(t => t.estado === estado)
        .filter(t => t.titulo.toLowerCase().includes(searchTerm) || (t.descripcion || '').toLowerCase().includes(searchTerm))
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
      tasksInColumn.forEach(tarea => {
        const tareaDiv = document.createElement('div');
        tareaDiv.classList.add('tarea');
        tareaDiv.setAttribute('draggable', 'true');
        tareaDiv.dataset.id = tarea.id;

        // Encabezado de la tarea
        const tareaHeader = document.createElement('div');
        tareaHeader.classList.add('tarea-header');
        const tituloElem = document.createElement('h3');
        tituloElem.innerHTML = tarea.titulo;
        const headerRightDiv = document.createElement('div');
        headerRightDiv.classList.add('header-right');
        const botonesDiv = document.createElement('div');
        botonesDiv.classList.add('botones');

        if (tarea.estado === COLUMN_STATES.TODO) {
          const btnMover = document.createElement('button');
          btnMover.classList.add('btn-move');
          btnMover.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Mi Día';
          btnMover.addEventListener('click', e => {
            e.stopPropagation();
            saveState();
            moverTarea(tarea.id, COLUMN_STATES.MY_DAY);
          });
          botonesDiv.appendChild(btnMover);
        } else if (tarea.estado === COLUMN_STATES.MY_DAY) {
          const btnCompletar = document.createElement('button');
          btnCompletar.classList.add('btn-complete');
          btnCompletar.innerHTML = '<i class="fa-solid fa-check"></i> Hecha';
          btnCompletar.addEventListener('click', e => {
            e.stopPropagation();
            saveState();
            moverTarea(tarea.id, COLUMN_STATES.DONE);
          });
          botonesDiv.appendChild(btnCompletar);
        }
        if (tarea.vencimiento && tarea.estado !== COLUMN_STATES.DONE) {
          const fechaSpan = document.createElement('span');
          fechaSpan.classList.add('due-date');
          // Aquí se puede calcular y mostrar la fecha con información adicional
          headerRightDiv.appendChild(fechaSpan);
        }
        headerRightDiv.appendChild(botonesDiv);
        tareaHeader.appendChild(tituloElem);
        tareaHeader.appendChild(headerRightDiv);
        tareaDiv.appendChild(tareaHeader);

        if (tarea.pasos && tarea.pasos.length > 0) {
          const completados = tarea.pasos.filter(p => p.completado).length;
          const total = tarea.pasos.length;
          const progresoElem = document.createElement('p');
          progresoElem.classList.add('progreso');
          progresoElem.textContent = `${completados} de ${total} pasos completados`;
          tareaDiv.appendChild(progresoElem);
        }

        // Al hacer clic se abre el modal (solo si no está hecha)
        tareaDiv.addEventListener('click', () => {
          if (tarea.estado !== COLUMN_STATES.DONE) abrirModal(true, tarea);
        });

        // Drag & Drop en escritorio
        tareaDiv.addEventListener('dragstart', dragStart);
        tareaDiv.addEventListener('dragend', dragEnd);

        // Controladores táctiles modificados para móviles
        if ('ontouchstart' in window) {
          tareaDiv.addEventListener('touchstart', touchStartTask, {passive: false});
          tareaDiv.addEventListener('touchmove', touchMoveTask, {passive: false});
          tareaDiv.addEventListener('touchend', touchEndTask, {passive: false});
        }

        col.appendChild(tareaDiv);
      });
    });
  }

  function moverTarea(id, nuevoEstado) {
    saveState();
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;
    tarea.estado = nuevoEstado;
    tarea.orden = tareas.filter(t => t.estado === nuevoEstado).length;
    guardarTareas();
    renderTareas();
  }
  
  const columnas = document.querySelectorAll('.columna');
  columnas.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      const contenedor = col.querySelector('.contenedor-tareas');
      const afterElement = getDragAfterElement(contenedor, e.clientY);
      const draggable = document.querySelector('.dragging');
      if (!draggable) return;
      if (!afterElement) contenedor.appendChild(draggable);
      else contenedor.insertBefore(draggable, afterElement);
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      const contenedor = col.querySelector('.contenedor-tareas');
      const nuevoEstado = contenedor.dataset.columna;
      const draggable = document.querySelector('.dragging');
      if (!draggable) return;
      const id = draggable.dataset.id;
      const childrenArray = Array.from(contenedor.querySelectorAll('.tarea'));
      const newIndex = childrenArray.indexOf(draggable);
      moverTareaConPosicion(id, nuevoEstado, newIndex);
    });
  });
  function moverTareaConPosicion(id, nuevoEstado, newIndex) {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;
    tarea.estado = nuevoEstado;
    const sameStateTasks = tareas.filter(t => t.estado === nuevoEstado && t.id !== id);
    if (newIndex < 0 || newIndex > sameStateTasks.length) sameStateTasks.push(tarea);
    else sameStateTasks.splice(newIndex, 0, tarea);
    sameStateTasks.forEach((t, i) => { t.orden = i; });
    const otherTasks = tareas.filter(t => t.estado !== nuevoEstado);
    tareas = [...otherTasks, ...sameStateTasks];
    guardarTareas();
    renderTareas();
  }
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.tarea:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  function dragStart(e) { e.target.classList.add('dragging'); }
  function dragEnd(e) { e.target.classList.remove('dragging'); }

  // ----- Controladores táctiles modificados para móviles -----
  function touchStartTask(e) {
    e.preventDefault();
    const el = e.currentTarget;
    // Registrar posición de inicio
    el.touchStartX = e.touches[0].clientX;
    el.touchStartY = e.touches[0].clientY;
    // Iniciar timeout de 200ms para activar el arrastre
    el.touchDragTimeout = setTimeout(() => {
      el.classList.add('dragging');
    }, 200);
  }
  
  function touchMoveTask(e) {
    e.preventDefault();
    const el = e.currentTarget;
    // Solo aplicar movimiento si ya se activó el modo arrastre
    if (!el.classList.contains('dragging')) return;
    let deltaX = e.touches[0].clientX - el.touchStartX;
    let deltaY = e.touches[0].clientY - el.touchStartY;
    el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }
  
  function touchEndTask(e) {
    e.preventDefault();
    const el = e.currentTarget;
    clearTimeout(el.touchDragTimeout);
    // Si no se activó el arrastre, interpretar como toque corto y abrir modal
    if (!el.classList.contains('dragging')) {
      const tarea = tareas.find(t => t.id === el.dataset.id);
      if (tarea && tarea.estado !== COLUMN_STATES.DONE) {
        abrirModal(true, tarea);
      }
      return;
    }
    // Finalizar arrastre
    el.style.transform = '';
    el.classList.remove('dragging');
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const container = dropTarget ? dropTarget.closest('.contenedor-tareas') : null;
    if (container && container.dataset.columna) {
      const nuevoEstado = container.dataset.columna;
      const tareaId = el.dataset.id;
      const taskElements = Array.from(container.querySelectorAll('.tarea:not(.dragging)'));
      let newIndex = taskElements.findIndex(taskEl => {
        const rect = taskEl.getBoundingClientRect();
        return touch.clientY < rect.top + rect.height / 2;
      });
      if(newIndex === -1) newIndex = taskElements.length;
      moverTareaConPosicion(tareaId, nuevoEstado, newIndex);
    } else {
      renderTareas();
    }
  }

  // Búsqueda con debounce
  searchInput.addEventListener('input', e => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchTerm = e.target.value.toLowerCase();
      renderTareas();
    }, 300);
  });

  btnToggleCalendar.addEventListener('click', () => {
    calendarModal.classList.add('active');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('active')) modal.classList.remove('active');
      if (calendarModal.classList.contains('active')) calendarModal.classList.remove('active');
    }
  });

  // Inicializar Flatpickr
  function inicializarFlatpickr() {
    picker = flatpickr("#vencimiento", {
      altInput: false,
      dateFormat: "Y-m-d",
      allowInput: true,
      locale: "es"
    });
  }

  // Inicialización
  cargarTareas();
  renderTareas();
  cargarTema();
  inicializarFlatpickr();

  return {
    undo,
    redo,
    cargarTareas,
    renderTareas
  };
})();
