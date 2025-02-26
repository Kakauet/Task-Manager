/* calendar.js - Módulo de Calendario Refactorizado con funcionalidad de arrastre en móvil */

const CalendarModule = (function() {
  // =======================================================================
  // Estado Interno
  // =======================================================================
  let calendarMode = 'month'; // 'week' o 'month'
  let currentDate = new Date(); // Fecha actual para navegar el calendario
  let events = []; // Eventos: { id, title, desc, date, graded, grade }

  // =======================================================================
  // Referencias a Elementos del DOM
  // =======================================================================
  const calendarModalEl = document.getElementById('calendarModal');
  const btnCloseCalendar = document.getElementById('btnCloseCalendar');
  const calendarTitleEl = document.getElementById('calendarTitle');
  const calendarListEl = document.getElementById('calendarList');
  const btnPrevWeek = document.getElementById('btnPrevWeek');
  const btnNextWeek = document.getElementById('btnNextWeek');
  const btnPrevMonth = document.getElementById('btnPrevMonth');
  const btnNextMonth = document.getElementById('btnNextMonth');
  const btnWeek = document.getElementById('btnWeek');
  const btnMonth = document.getElementById('btnMonth');

  // Elementos del modal para gestionar eventos
  const eventModalEl = document.getElementById('eventModal');
  const eventCloseBtn = document.getElementById('eventCloseBtn');
  const eventModalTitle = document.getElementById('eventModalTitle');
  const eventSubTitle = document.getElementById('eventSubTitle');
  const eventForm = document.getElementById('eventForm');
  const inputEventId = document.getElementById('eventId');
  const inputEventDate = document.getElementById('eventDate');
  const inputEventTitle = document.getElementById('eventTitle');
  const inputEventDesc = document.getElementById('eventDesc');
  const btnEliminarEvento = document.getElementById('btnEliminarEvento');

  // =======================================================================
  // Eventos de Interfaz
  // =======================================================================
  // Cerrar modal del calendario
  btnCloseCalendar.addEventListener('click', () => {
    calendarModalEl.classList.remove('active'); // Oculta el calendario
  });

  // =======================================================================
  // Funciones de Utilidad para Fechas y Generación de ID
  // =======================================================================
  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function toISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function formatoCorto(dateObj) {
    return `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
  }
  function nombreDia(idx) {
    const nombres = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return nombres[idx];
  }
  function esHoy(dateObj) {
    const hoy = new Date();
    return (
      dateObj.getFullYear() === hoy.getFullYear() &&
      dateObj.getMonth() === hoy.getMonth() &&
      dateObj.getDate() === hoy.getDate()
    );
  }
  function generarID() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  // =======================================================================
  // Gestión del Almacenamiento de Eventos (LocalStorage)
  // =======================================================================
  function cargarEventos() {
    const stored = localStorage.getItem('events');
    if (stored) {
      events = JSON.parse(stored);
    }
  }
  function guardarEventos() {
    localStorage.setItem('events', JSON.stringify(events));
  }

  // =======================================================================
  // Renderización del Calendario
  // =======================================================================
  
  function renderCalendar() {
    calendarListEl.innerHTML = '';
    calendarListEl.classList.remove('calendar-week-grid', 'calendar-month-grid');

    if (calendarMode === 'week') {
      calendarListEl.classList.add('calendar-week-grid');
      renderWeekView();
    } else {
      calendarListEl.classList.add('calendar-month-grid');
      renderMonthView();
    }
  }

  // ----- Vista Semanal -----
  function renderWeekView() {
    const dateCopy = new Date(currentDate);
    const dayOfWeek = dateCopy.getDay();
    let diff = dayOfWeek === 0 ? 6 : (dayOfWeek - 1);
    dateCopy.setDate(dateCopy.getDate() - diff);

    const startWeek = new Date(dateCopy);
    const endWeek = new Date(dateCopy);
    endWeek.setDate(endWeek.getDate() + 6);
    calendarTitleEl.textContent = `Semana ${formatoCorto(startWeek)} - ${formatoCorto(endWeek)}`;

    for (let i = 0; i < 7; i++) {
      const day = new Date(dateCopy);
      const listItem = document.createElement('li');
      listItem.classList.add('calendar-day', 'week-cell');
      // Asignamos el atributo data-date para identificar la celda
      const dayStr = toISO(day);
      listItem.dataset.date = dayStr;
      if (esHoy(day)) listItem.classList.add('today');

      // Información básica del día (nombre y número)
      const dayInfo = document.createElement('div');
      dayInfo.classList.add('day-info');
      const dayName = document.createElement('div');
      dayName.classList.add('day-name');
      dayName.textContent = nombreDia(day.getDay());
      const dayNumber = document.createElement('div');
      dayNumber.classList.add('day-number');
      dayNumber.textContent = day.getDate();
      dayInfo.appendChild(dayName);
      dayInfo.appendChild(dayNumber);
      listItem.appendChild(dayInfo);

      // Contenedor para eventos del día
      const eventsContainer = document.createElement('div');
      eventsContainer.classList.add('events-container');
      events
        .filter(ev => ev.date === dayStr)
        .forEach(ev => eventsContainer.appendChild(crearEventElement(ev)));
      listItem.appendChild(eventsContainer);

      // Evento para abrir modal al hacer clic en el día (si no se hace clic en un evento)
      listItem.addEventListener('click', e => {
        if (!e.target.closest('.calendar-event')) {
          abrirEventModal(null, dayStr);
        }
      });

      // Permite arrastrar y soltar eventos (drag and drop)
      listItem.addEventListener('dragover', e => e.preventDefault());
      listItem.addEventListener('drop', e => {
        e.preventDefault();
        const draggable = document.querySelector('.calendar-event.dragging');
        if (!draggable) return;
        moverEventoADia(draggable.dataset.id, dayStr);
      });

      calendarListEl.appendChild(listItem);
      dateCopy.setDate(dateCopy.getDate() + 1);
    }
  }

  // ----- Vista Mensual -----
  function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = [
      "Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    calendarTitleEl.textContent = `${monthNames[month]} ${year}`;

    // Cabecera de la semana (abreviaturas)
    ["L","M","X","J","V","S","D"].forEach(d => {
      const headerItem = document.createElement('li');
      headerItem.classList.add('month-header');
      headerItem.textContent = d;
      calendarListEl.appendChild(headerItem);
    });

    // Determina el primer día y celdas vacías previas
    const firstDay = new Date(year, month, 1);
    let startIndex = firstDay.getDay();
    if (startIndex === 0) startIndex = 7;
    const emptyDaysBefore = startIndex - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < emptyDaysBefore; i++) {
      const emptyCell = document.createElement('li');
      emptyCell.classList.add('calendar-day', 'month-cell');
      calendarListEl.appendChild(emptyCell);
    }

    // Relleno de celdas con cada día del mes
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const cell = document.createElement('li');
      cell.classList.add('calendar-day', 'month-cell');
      const currentDay = new Date(year, month, dayNum);
      // Asignamos el atributo data-date
      const dayStr = toISO(currentDay);
      cell.dataset.date = dayStr;
      if (esHoy(currentDay)) cell.classList.add('today');
      const dayNumber = document.createElement('div');
      dayNumber.classList.add('day-number');
      dayNumber.textContent = dayNum;
      cell.appendChild(dayNumber);

      // Contenedor para eventos del día
      const eventsContainer = document.createElement('div');
      eventsContainer.classList.add('events-container');
      events
        .filter(ev => ev.date === dayStr)
        .forEach(ev => eventsContainer.appendChild(crearEventElement(ev)));
      cell.appendChild(eventsContainer);

      // Abre modal de evento al hacer clic en la celda (si no se hace clic en un evento)
      cell.addEventListener('click', e => {
        if (!e.target.closest('.calendar-event')) {
          abrirEventModal(null, dayStr);
        }
      });
      // Habilita arrastrar y soltar sobre la celda
      cell.addEventListener('dragover', e => e.preventDefault());
      cell.addEventListener('drop', e => {
        e.preventDefault();
        const draggable = document.querySelector('.calendar-event.dragging');
        if (!draggable) return;
        moverEventoADia(draggable.dataset.id, dayStr);
      });
      calendarListEl.appendChild(cell);
    }
  }

  // =======================================================================
  // Creación y Configuración de Elementos de Evento
  // =======================================================================
  function crearEventElement(ev) {
    const eventEl = document.createElement('div');
    eventEl.classList.add('calendar-event');

    // Estilos según calificación
    if (ev.graded && (!ev.grade || ev.grade === "")) {
      const eventDate = new Date(ev.date + "T00:00:00");
      const today = new Date();
      today.setHours(0,0,0,0);
      if (eventDate > today) {
        eventEl.classList.add('pending-grade');
      } else {
        eventEl.classList.add('ungraded');
      }
    }
    
    // Título reducido
    const titleSpan = document.createElement('span');
    titleSpan.classList.add('small-event-title');
    titleSpan.textContent = ev.title;
    eventEl.appendChild(titleSpan);
    
    // Muestra la nota si existe
    if (ev.grade) {
      const gradeEl = document.createElement('span');
      gradeEl.classList.add('event-grade');
      gradeEl.textContent = ev.grade + '/10';
      eventEl.appendChild(gradeEl);
    }
    
    // Configuración de accesibilidad y propiedades de arrastre
    eventEl.setAttribute("role", "button");
    eventEl.setAttribute("aria-label", "Editar evento: " + ev.title);
    eventEl.setAttribute('draggable', 'true');
    eventEl.dataset.id = ev.id;
    eventEl.addEventListener('dragstart', eventDragStart);
    eventEl.addEventListener('dragend', eventDragEnd);
    eventEl.addEventListener('click', e => {
      e.stopPropagation();
      abrirEventModal(ev, ev.date);
    });
    
    // Solo en móvil: añade controladores táctiles para arrastre
    if ('ontouchstart' in window) {
      eventEl.addEventListener('touchstart', touchStartEvent, { passive: false });
      eventEl.addEventListener('touchmove', touchMoveEvent, { passive: false });
      eventEl.addEventListener('touchend', touchEndEvent, { passive: false });
    }
    
    return eventEl;
  }

  // =======================================================================
  // Funciones de Arrastre (Drag & Drop)
  // =======================================================================
  function eventDragStart(e) {
    e.target.classList.add('dragging');
  }
  function eventDragEnd(e) {
    e.target.classList.remove('dragging');
  }
  function moverEventoADia(eventId, newDate) {
    const idx = events.findIndex(e => e.id === eventId);
    if (idx >= 0) {
      events[idx].date = newDate;
      guardarEventos();
      renderCalendar();
    }
  }

  // =======================================================================
  // Funciones Táctiles para Móviles (solo activas en modo móvil)
  // =======================================================================
  function touchStartEvent(e) {
    const el = e.currentTarget;
    el.originalRect = el.getBoundingClientRect();
    el.touchStartX = e.touches[0].clientX;
    el.touchStartY = e.touches[0].clientY;
    el.longPressTimeout = setTimeout(() => {
      const clone = el.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = el.originalRect.left + 'px';
      clone.style.top = el.originalRect.top + 'px';
      clone.style.width = el.originalRect.width + 'px';
      clone.style.zIndex = 1000;
      clone.style.pointerEvents = 'none';
      document.body.appendChild(clone);
      el.floatingClone = clone;
      el.isDragging = true;
      el.classList.add('dragging');
      el.classList.add('hidden-during-drag');
    }, 300);
  }

  function touchMoveEvent(e) {
    e.preventDefault(); // Evita el scroll durante el arrastre
    const el = e.currentTarget;
    const touch = e.touches[0];
    const deltaX = touch.clientX - el.touchStartX;
    const deltaY = touch.clientY - el.touchStartY;
    if (el.isDragging && el.floatingClone) {
      const newLeft = el.originalRect.left + deltaX;
      const newTop = el.originalRect.top + deltaY;
      el.floatingClone.style.left = newLeft + 'px';
      el.floatingClone.style.top = newTop + 'px';
    } else {
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 10) {
        clearTimeout(el.longPressTimeout);
      }
    }
  }

  function touchEndEvent(e) {
    const el = e.currentTarget;
    clearTimeout(el.longPressTimeout);
    if (!el.isDragging) return;
    const touch = e.changedTouches[0];
    // Obtenemos el elemento en la posición final del toque
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    // Buscamos la celda del calendario que tenga el atributo data-date
    const dayCell = dropTarget ? dropTarget.closest('.calendar-day[data-date]') : null;
    if (dayCell && dayCell.dataset.date) {
      moverEventoADia(el.dataset.id, dayCell.dataset.date);
    }
    // Limpiar clon flotante y estados
    if (el.floatingClone) {
      document.body.removeChild(el.floatingClone);
      el.floatingClone = null;
    }
    el.classList.remove('hidden-during-drag');
    el.isDragging = false;
    el.classList.remove('dragging');
  }

  // =======================================================================
  // Gestión del Modal de Eventos (Nuevo/Edición/Eliminación)
  // =======================================================================
  function abrirEventModal(ev, dateStr) {
    eventModalEl.classList.add('active');
    if (ev) {
      // Configuración para editar un evento existente
      eventModalTitle.textContent = 'Editar Evento';
      eventSubTitle.textContent = `Fecha: ${ev.date}`;
      inputEventId.value = ev.id;
      inputEventDate.value = ev.date;
      inputEventTitle.value = ev.title;
      inputEventDesc.value = ev.desc || '';
      btnEliminarEvento.style.display = 'inline-block';
      document.getElementById('gradedEvent').checked = ev.graded || false;
      document.getElementById('eventGrade').value = ev.grade || '';
      document.getElementById('gradeSection').style.display = ev.graded ? 'block' : 'none';
    } else {
      // Configuración para crear un nuevo evento
      eventModalTitle.textContent = 'Nuevo Evento';
      eventSubTitle.textContent = `Fecha: ${dateStr}`;
      inputEventId.value = '';
      inputEventDate.value = dateStr;
      inputEventTitle.value = '';
      inputEventDesc.value = '';
      btnEliminarEvento.style.display = 'none';
      document.getElementById('gradedEvent').checked = false;
      document.getElementById('eventGrade').value = '';
      document.getElementById('gradeSection').style.display = 'none';
    }
  }
  // Cierra el modal de eventos
  eventCloseBtn.addEventListener('click', () => {
    eventModalEl.classList.remove('active');
  });

  // Procesa el formulario del evento (creación o edición)
  eventForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = inputEventId.value;
    const date = inputEventDate.value;
    const title = inputEventTitle.value.trim();
    const desc = inputEventDesc.value.trim();
    const isGraded = document.getElementById('gradedEvent').checked;
    const gradeValue = document.getElementById('eventGrade').value.trim();
    if (!title) return;
    if (id) {
      // Actualiza evento existente
      const idx = events.findIndex(ev => ev.id === id);
      if (idx !== -1) {
        events[idx] = { ...events[idx], title, desc, date, graded: isGraded, grade: isGraded ? gradeValue : null };
      }
    } else {
      // Crea nuevo evento
      const newEv = {
        id: generarID(),
        title,
        desc,
        date,
        graded: isGraded,
        grade: isGraded ? gradeValue : null
      };
      events.push(newEv);
      // Si el título sugiere un examen, se genera automáticamente una tarea relacionada
      if (/examen/i.test(title)) {
        const examTitle = title.replace(/examen/ig, '').trim();
        const newTaskTitle = 'Estudiar ' + examTitle;
        let fechaTarea = new Date(date + 'T00:00:00');
        const fechaStr = toISODate(fechaTarea);
        let tasks = JSON.parse(localStorage.getItem('tareas')) || [];
        const nuevaTarea = {
          id: generarID(),
          titulo: newTaskTitle,
          descripcion: desc,
          estado: 'por-hacer',
          orden: tasks.filter(t => t.estado === 'por-hacer').length,
          pasos: [],
          vencimiento: fechaStr
        };
        tasks.push(nuevaTarea);
        localStorage.setItem('tareas', JSON.stringify(tasks));
        if (typeof window.cargarTareas === 'function' && typeof window.renderTareas === 'function') {
          window.cargarTareas();
          window.renderTareas();
        }
      }
    }
    guardarEventos();
    eventModalEl.classList.remove('active');
    renderCalendar();
  });
  // Botón para eliminar evento
  btnEliminarEvento.addEventListener('click', () => {
    const id = inputEventId.value;
    if (!id) return;
    if (!confirm('¿Seguro de eliminar este evento?')) return;
    events = events.filter(ev => ev.id !== id);
    guardarEventos();
    eventModalEl.classList.remove('active');
    renderCalendar();
  });

  // =======================================================================
  // Controles de Navegación y Cambio de Vista
  // =======================================================================
  btnWeek.addEventListener('click', () => {
    calendarMode = 'week';
    btnWeek.classList.add('active');
    btnMonth.classList.remove('active');
    document.querySelectorAll('.week-only').forEach(el => el.style.display = 'inline-block');
    document.querySelectorAll('.month-only').forEach(el => el.style.display = 'none');
    renderCalendar();
  });
  btnMonth.addEventListener('click', () => {
    calendarMode = 'month';
    btnMonth.classList.add('active');
    btnWeek.classList.remove('active');
    document.querySelectorAll('.week-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.month-only').forEach(el => el.style.display = 'inline-block');
    renderCalendar();
  });
  btnPrevWeek.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); });
  btnNextWeek.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
  btnPrevMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
  btnNextMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

  // Cierre de modales con la tecla Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (calendarModalEl.classList.contains('active')) {
        calendarModalEl.classList.remove('active');
      }
      if (eventModalEl.classList.contains('active')) {
        eventModalEl.classList.remove('active');
      }
    }
  });

  // =======================================================================
  // Inicialización del Módulo
  // =======================================================================
  function init() {
    cargarEventos();
    renderCalendar();
    btnMonth.classList.add('active');
    btnWeek.classList.remove('active');
    document.querySelectorAll('.week-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.month-only').forEach(el => el.style.display = 'inline-block');
  }

  return { init };
})();

// Inicia el módulo del calendario
CalendarModule.init();