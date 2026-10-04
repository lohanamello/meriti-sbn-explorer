export function VegetationGuide() {
  return <details className="vegetation-guide">
    <summary>Vegetação total ou árvores: qual camada usar?</summary>
    <p><strong>Copas de árvores e vegetação total são medidas diferentes.</strong> Grama e jardins podem aparecer como vegetação sem oferecer a mesma sombra de uma copa. O objetivo deste projeto é medir toda a vegetação viva. Use Vegetação geral · 2026 para explorar o sinal das plantas e Conferir células para avaliar os erros. As medidas de árvores são complementares.</p>
    <dl>
      <div><dt>Foto detalhada</dt><dd>Inspeção visual de copas, telhados e sombras. Não é uma classificação automática. Data e nitidez variam por local.</dd></div>
      <div><dt>Vegetação geral · 2026</dt><dd>Sinal de plantas em pixels de 10 m: árvores, arbustos, gramados e jardins podem se misturar com construções. Não conta árvores nem delimita suas copas.</dd></div>
      <div><dt>Copas estimadas · 2019</dt><dd>Modelo de altura a partir de imagem de 2019. Ajuda a procurar copas históricas; pode confundir árvores com edifícios. Não representa um inventário atual.</dd></div>
      <div><dt>Árvores nas ruas · IBGE</dt><dd>Observação do entorno das vias em 2022–2023, resumida por setor censitário. Indica presença de árvores junto às ruas, sem desenhar copas ou medir toda a vegetação dos lotes.</dd></div>
      <div><dt>Persistência do verde · 2025</dt><dd>Mostra onde o sinal vegetal reaparece nas imagens mensais. Ajuda a investigar variação sazonal, mas não distingue árvores de gramados persistentes.</dd></div>
      <div><dt>Cobertura vegetal mapeada · MapBiomas</dt><dd>Classes de uso e cobertura do solo para comparar anos. Um lugar classificado como urbano pode conter árvores; urbano não significa ausência de arborização.</dd></div>
    </dl>
    <p>Uma estimativa de vegetação total precisa avaliar plantas que o modelo marcou e também as que deixou de marcar. A foto mais nítida não recalcula os indicadores existentes.</p>
    <a href="/validacao#conferir-celulas">Abrir as 400 células de conferência</a>
  </details>;
}
