document.addEventListener('DOMContentLoaded', function() {
  // Exporta los datos de la aplicación a un archivo JSON
  function exportData() {
    const tareas = localStorage.getItem('tareas');
    const events = localStorage.getItem('events');
    const theme = localStorage.getItem('theme');

    // Prepara el objeto con los datos a exportar
    const data = {
      tareas: tareas ? JSON.parse(tareas) : [],
      events: events ? JSON.parse(events) : [],
      theme: theme || 'dark'
    };

    // Crea el archivo JSON y genera un enlace de descarga temporal
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "data_export.json";
    document.body.appendChild(a);
    a.click();

    // Limpieza: elimina el enlace y revoca la URL temporal
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Importa datos desde un archivo JSON y actualiza el almacenamiento local
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = "application/json";
    
    // Maneja la selección del archivo e intenta leer e importar los datos
    input.addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.tareas) {
            localStorage.setItem('tareas', JSON.stringify(importedData.tareas));
          }
          if (importedData.events) {
            localStorage.setItem('events', JSON.stringify(importedData.events));
          }
          if (importedData.theme) {
            localStorage.setItem('theme', importedData.theme);
          }
          alert("Datos importados correctamente. Se recargará la página.");
          location.reload();
        } catch (error) {
          alert("Error al importar datos: " + error);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }
  
  // Configuración del menú desplegable del botón "Archivo"
  const btnArchivo = document.getElementById('btnArchivo');
  const archivoDropdown = document.getElementById('archivoDropdown');

  // Alterna la visibilidad del menú desplegable al hacer clic en el botón "Archivo"
  btnArchivo.addEventListener('click', function(e) {
    e.stopPropagation();
    archivoDropdown.classList.toggle('show');
  });
  
  // Cierra el menú desplegable al hacer clic fuera del mismo
  document.addEventListener('click', function() {
    if (archivoDropdown.classList.contains('show')) {
      archivoDropdown.classList.remove('show');
    }
  });
  
  // Evita que los clics dentro del menú cierren el mismo accidentalmente
  archivoDropdown.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Asocia la acción de exportar datos al enlace correspondiente
  document.getElementById('exportar').addEventListener('click', function(e) {
    e.preventDefault();
    exportData();
    archivoDropdown.classList.remove('show');
  });
  
  // Asocia la acción de importar datos al enlace correspondiente
  document.getElementById('importar').addEventListener('click', function(e) {
    e.preventDefault();
    importData();
    archivoDropdown.classList.remove('show');
  });
});