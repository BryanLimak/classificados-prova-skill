# simulando-prova-skill

Skill (conjunto de instruções) para qualquer assistente de IA gerar o **JSON de uma prova** no molde `simulando-prova/v1`, pronto para importar na plataforma **Simulando**.

Uma prova é um agrupador com **N simulados**. Cada simulado tem suas questões de múltipla escolha, nota mínima e tempo limite. Com a skill instalada, basta pedir:

> "Crie uma prova de Direito Constitucional para concursos com 3 simulados de 20 questões."

…e importar o JSON gerado em **Nova prova → Importar JSON** (ou, dentro de uma prova existente, **Importar JSON** para adicionar mais simulados).

## O que tem aqui

| Arquivo | Para quê |
|---|---|
| [`SKILL.md`](SKILL.md) | A skill em si: instruções que o assistente segue (formato, regras, boas práticas, checklist). É o único arquivo que o assistente precisa. |
| [`schema/prova.schema.json`](schema/prova.schema.json) | JSON Schema do molde, para validar automaticamente. |
| [`examples/`](examples/) | Um exemplo mínimo e um completo (3 simulados) para copiar. |
| [`scripts/validate.js`](scripts/validate.js) / [`scripts/validate.py`](scripts/validate.py) | Validadores sem dependências: `node scripts/validate.js prova.json` ou `python scripts/validate.py prova.json`. |

## Como instalar no seu assistente de IA

A skill é texto. Qualquer assistente que aceite instruções consegue usá-la. Escolha o jeito que o seu assistente oferece:

1. **Instruções fixas / "instruções personalizadas" / "projeto" / "GPT personalizado"**: copie o conteúdo de `SKILL.md` e cole no campo de instruções. A partir daí, todo pedido de prova sai no molde certo.
2. **Pasta de skills** (assistentes que carregam skills de uma pasta, como o Claude Code e o Claude.ai): baixe este repositório (botão *Code → Download ZIP* ou `git clone`) e coloque a pasta `simulando-prova-skill` na pasta de skills do assistente, por exemplo `~/.claude/skills/simulando-prova`. O arquivo `SKILL.md` tem o cabeçalho que esses assistentes esperam (`name` e `description`).
3. **Uma conversa só**: cole o `SKILL.md` como primeira mensagem e, em seguida, faça o pedido. Funciona em qualquer chat, inclusive os gratuitos.
4. **Agentes com acesso a arquivos**: aponte o agente para a URL deste repositório e peça "leia o SKILL.md e siga a skill".

Depois de instalar, teste com um pedido curto ("crie uma prova de teste com 1 simulado de 3 questões sobre frações") e valide com `scripts/validate.js` ou importando na plataforma.

### Atualizações

O `SKILL.md` tem uma linha **"Versão da skill"** (data). A cada uso, o assistente confere no GitHub se há uma versão mais nova; se houver, segue a de lá e avisa você numa linha para atualizar a sua cópia. Assistentes sem acesso à internet usam a cópia que você instalou. Para atualizar à mão, baixe de novo o repositório (ou `git pull`) e substitua a pasta ou o texto colado.

## Como pedir (exemplos)

- "Crie uma prova de **Inglês para iniciantes** com 2 simulados de 15 questões, um de vocabulário e um de gramática, enunciados em inglês."
- "Monte uma prova para o **ENEM, Matemática**, 4 simulados de 25 questões, dificuldade crescente, explicação em todas."
- "Converta este material em uma prova de 2 simulados" (anexando a apostila/PDF/texto).
- "Gere um simulado só, 30 questões de **Salesforce Administrator**, com algumas questões de múltiplas respostas corretas."

Se o assistente não perguntar nada, ele usa o padrão: 3 simulados de 20 questões, 4 alternativas, uma correta, dificuldade crescente.

## Duas regras importantes

- **O gabarito do material nunca é corrigido.** Ao converter apostila, PDF ou lista com respostas, a alternativa correta é a que a fonte indica, mesmo que o assistente discorde, e as alternativas ficam na ordem da fonte. Se a fonte não traz a resposta de alguma questão, o assistente responde e avisa quais foram respondidas por ele.
- **Explicações citam alternativas como `{{B}}`.** A letra se refere à ordem no arquivo; na plataforma, cada `{{B}}` vira a letra com que aquela alternativa aparece para a pessoa, mesmo com as alternativas embaralhadas.

## O molde, em resumo

```json
{
  "format": "simulando-prova/v1",
  "prova": { "title": "Título da prova", "description": "Opcional", "category": "certificacoes", "icon": "ABC" },
  "simulados": [
    {
      "title": "Simulado 1",
      "pass_score": 70,
      "time_limit_min": 60,
      "questions": [
        {
          "text": "Enunciado?",
          "explanation": "Por que {{A}} está certa.",
          "alternatives": [
            { "text": "Alternativa A", "is_correct": true },
            { "text": "Alternativa B" },
            { "text": "Alternativa C" },
            { "text": "Alternativa D" }
          ]
        }
      ]
    }
  ]
}
```

O nome antigo do formato, `classificados-prova/v1`, continua aceito. Regras principais: 1 a 50 simulados; 1 a 1000 questões por simulado; 2 a 8 alternativas por questão; pelo menos uma correta (mais de uma vira questão de múltiplas respostas); na explicação, `{{A}}` a `{{H}}` citam as alternativas pela ordem no arquivo. Categorias aceitas: `tecnologia`, `programacao`, `certificacoes`, `idiomas`, `concursos`, `vestibular`, `escolar`, `negocios`, `saude`, `direito`, `exatas`, `humanas`, `ciencias`, `outros`. A tabela completa de campos está em `SKILL.md`.

## Validar um arquivo

```bash
node scripts/validate.js minha-prova.json
# ou
python scripts/validate.py minha-prova.json
```

O validador mostra um resumo (simulados, questões, alternativas, corretas) e lista os problemas com a posição exata. Ele também acusa `{{E}}` numa questão de 4 alternativas e avisa quando a explicação cita letras sem chaves ou quando uma alternativa cita outras ("A e B", "todas as anteriores").

## Licença

MIT. Use, copie e adapte à vontade.
