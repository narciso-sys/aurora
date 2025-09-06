async function callGeminiAPI(prompt) {
  // Em um ambiente real, você usaria uma chave de API válida
  // Esta é uma implementação simulada para fins educacionais
  
  console.log("📞 Chamando API do Gemini com prompt:", prompt);
  
  // Simular um delay de rede
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Respostas simuladas baseadas no tipo de prompt
  if (prompt.includes('Análise de Despesas')) {
    return `📊 Análise de Despesas Financeiras:

1. Resumo das Despesas:
   - Total gasto: ${prompt.match(/Total de despesas: ([^\n]+)/)[1]}
   - Número de transações: ${prompt.match(/Número de transações: (\d+)/)[1]}
   - Maior gasto individual: ${prompt.match(/Maior gasto individual: ([^\n]+)/)[1]}
   - Média por transação: ${prompt.match(/Média por transação: ([^\n]+)/)[1]}

2. Padrões Identificados:
   - Seus gastos mostram uma distribuição variada, com algumas transações de valor significativo.
   - Recomendo categorizar suas despesas para melhor entendimento.

3. Dicas para Economizar:
   - Estabeleça um orçamento mensal e acompanhe seus gastos regularmente.
   - Identifique gastos não essenciais que podem ser reduzidos.
   - Considere automatizar poupança para garantir que reserve uma parte da sua renda.`;
  }
  
  if (prompt.includes('Educação Financeira')) {
    return `💡 Educação Financeira - Tópicos Principais:

1. Orçamento Pessoal: A base do controle financeiro é saber para onde seu dinheiro está indo. Categorize suas despesas e identifique oportunidades de economia.

2. Reserva de Emergência: Antes de investir, construa uma reserva equivalente a 3-6 meses de despesas essenciais em uma aplicação de fácil acesso.

3. Investimentos Conscientes: Entenda seu perfil de risco (conservador, moderado ou arrojado) antes de escolher onde investir. Diversificação é a chave para reduzir riscos.

4. Crédito Responsável: Use o crédito a seu favor, nunca gastando mais do que pode pagar. Evite ao máximo o rotativo do cartão de crédito.

Lembre-se: educação financeira é um processo contínuo. Continue aprendendo e ajustando suas estratégias!`;
  }
  
  // Resposta padrão para outros tipos de prompt
  return `🤖 Resposta do Assistente Financeiro:

Com base na sua solicitação, aqui estão algumas informações relevantes:

${prompt.includes('finanças') ? 'Para melhorar sua saúde financeira, recomendo:' : 'Para otimizar seus recursos, considere:'}

1. Definir objetivos financeiros claros (curto, médio e longo prazo)
2. Automatizar suas economias para garantir consistência
3. Revisar regularmente seus gastos e investimentos
4. Buscar educação financeira continuamente

Lembre-se que cada decisão financeira deve alinhar-se com seus objetivos pessoais e tolerância ao risco.`;
}