<template>
  <div class="buscador-container">
    <div class="input-wrapper">
      <!-- Ícono de búsqueda (usamos un SVG básico) -->
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      
      <input 
        type="text" 
        placeholder="Buscar salón, edificio o área..." 
        class="search-input"
      />
    </div>
  </div>
</template>

<script setup>
// Por ahora solo es visual, luego le agregaremos la lógica de autocompletado
</script>

<style scoped>
.buscador-container {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%); /* Centra el buscador horizontalmente */
  width: 90%;
  max-width: 400px;
  z-index: 10; /* Asegura que flote POR ENCIMA del mapa */
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  padding: 10px 15px;
  border-radius: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease;
}

.input-wrapper:focus-within {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #666;
  margin-right: 10px;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 16px;
  color: #333;
  background: transparent;
}

.search-input::placeholder {
  color: #999;
}
</style>