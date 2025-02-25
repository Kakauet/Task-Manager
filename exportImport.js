document.addEventListener('DOMContentLoaded', function(){
    // Función para exportar datos de la aplicación
    function exportData() {
      const tareas = localStorage.getItem('tareas');
      const events = localStorage.getItem('events');
      const theme = localStorage.getItem('theme');
      const data = {
        tareas: tareas ? JSON.parse(tareas) : [],
        events: events ? JSON.parse(events) : [],
        theme: theme || 'dark'
      };
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "data_export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    // Función para importar datos desde un archivo JSON
    function importData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = "application/json";
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
  
    // Manejo del menú desplegable del botón Archivo
    const btnArchivo = document.getElementById('btnArchivo');
    const archivoDropdown = document.getElementById('archivoDropdown');
    
    btnArchivo.addEventListener('click', function(e) {
      e.stopPropagation();
      archivoDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', function() {
      if (archivoDropdown.classList.contains('show')) {
        archivoDropdown.classList.remove('show');
      }
    });
    
    archivoDropdown.addEventListener('click', function(e){
      e.stopPropagation();
    });
    
    document.getElementById('exportar').addEventListener('click', function(e){
      e.preventDefault();
      exportData();
      archivoDropdown.classList.remove('show');
    });
    
    document.getElementById('importar').addEventListener('click', function(e){
      e.preventDefault();
      importData();
      archivoDropdown.classList.remove('show');
    });
  });  