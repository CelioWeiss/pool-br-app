export const states = [
    { name: 'São Paulo', abbr: 'SP' },
    { name: 'Rio de Janeiro', abbr: 'RJ' },
    { name: 'Minas Gerais', abbr: 'MG' },
    { name: 'Bahia', abbr: 'BA' },
];

export const cities: Record<string, string[]> = {
    SP: ['São Paulo', 'Campinas', 'Guarulhos', 'Santos'],
    RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'São Gonçalo'],
    MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
    BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari'],
};
