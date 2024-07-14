<template>
  <div class="page f-col-ac light">
    <img src="@/assets/text_logo.svg" class="logo my-4" height="150"/>
    <h1 class="my-4">Tato adresa neexistuje. Zkontrolujte prosím, zda je napsaná správně.</h1>
    <h2 class="my-4">Správný tvar je <strong>portal.mapotip.cz/nazev-portalu</strong></h2>
    <div class="f-grow"/>
    <img src="@/assets/map_not_exist.svg" class="image my-4"/>
    <div class="f-grow"/>
    <footer>
      <p class="xl">mapotip@mapotip.cz</p>
      <p class="xl">+420 704 11 22 00</p>
      <p>Copyright © {{ new Date().getFullYear() }} Mapotip Česko s.r.o.</p>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  overflow: auto;
  padding: 16px;
  text-align: center;
  gap: 16px;
}
.logo {
  width: 400px;
  max-width: 100%;
  min-height: 10px;
  object-fit: contain;
}
.image {
  height: 180px;
}
h1 {
  font-size: clamp(22px, 3vw, 32px);
}
footer {
  p {
    margin: 8px;
  }
  .xl {
    font-size: 25px;
  }
}
</style>
