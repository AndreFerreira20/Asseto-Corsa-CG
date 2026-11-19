# Convenções do Projeto (Commits, Branches e Código)

Este documento define o fluxo de trabalho do Git, o padrão de nomes das *branches*, o formato das mensagens de *commit* e as regras de escrita do código do **Assetto-Corsa-CG**.

---

## Padrão de Mensagens de Commit (Uma Linha)

Formato obrigatório (baseado no Conventional Commits):
`<tipo>: <descrição curta no imperativo>`

* Descrição em português, em letras minúsculas e sem acento ou cedilha.
* Use o verbo na forma "adiciona", "corrige", "ajusta", e não "adicionado" ou "add".
* Um commit deve tratar de um assunto só.

Commits antigos do histórico que não seguem esse formato são anteriores à definição do padrão e não precisam ser alterados.

---

## Tipos de Commits

* **`feat:`** Adição de uma nova funcionalidade
  * `feat: adiciona cronometro de volta`
  * `feat: cria modelo do carro de formula`

* **`fix:`** Correção de um bug ou erro
  * `fix: corrige carro atravessando o muro da pista`
  * `fix: corrige direcao do farol ao girar o carro`

* **`refactor:`** Mudança no código que não altera o comportamento (refatoração)
  * `refactor: separa criacao da pista em arquivo proprio`
  * `refactor: transforma parametros do carro em objeto de configuracao`

* **`docs:`** Alterações na documentação (README, contexto, relatórios)
  * `docs: adiciona relatorio parte 3`
  * `docs: atualiza estado atual no contexto do projeto`

* **`style:`** Formatação, espaçamento, comentários ou ajustes de posição/cor sem mudar a lógica
  * `style: altera a posicao da camera 3a pessoa`
  * `style: remove comentarios nao utilizados`

* **`perf:`** Melhoria no desempenho do código
  * `perf: reutiliza materiais da grama entre as faixas`

* **`chore:`** Tarefas de manutenção, configuração ou build sem alterar o código do jogo
  * `chore: atualiza versao do vite`
  * `chore: ignora pasta dist no .gitignore`

---

## Fluxo de Trabalho e Padrão de Branches

### Estrutura das Branches

* **`main`**: Branch principal com o código estável e pronto para entrega.
* **`develop`**: Branch de desenvolvimento integrado. É criada a partir da `main` e serve como base para a criação e junção de todas as funcionalidades.
* **Branches de tarefas (`<tipo>/<titulo>`)**: Criadas a partir da `develop` para desenvolver uma funcionalidade, corrigir um bug ou refatorar. O `<tipo>` usa os mesmos tipos dos commits e o `<titulo>` fica em kebab-case, sem acento.
  * Exemplos: `feat/pista-monza`, `feat/selecao-carro`, `fix/colisao-muro`, `refactor/modulos-carro`.

### Fluxo de Desenvolvimento

1. Crie uma nova branch a partir da `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b <tipo>/<titulo-da-branch>
   ```

2. Desenvolva as alterações e faça os commits seguindo o padrão.

3. Abra um Pull Request (PR) da sua branch com destino à `develop`.

4. De preferência, o outro integrante revisa e faz o merge. Qualquer um dos dois pode fazer o merge se necessário.

5. Após a validação na `develop`, é feito o PR da `develop` para a `main`.

### Conflitos de Merge

Leia as duas versões do trecho em conflito, mantenha o comportamento que as duas branches queriam, remova os marcadores de conflito e teste o jogo no navegador antes de concluir o merge. O commit de resolução usa o tipo `fix:`, como em `fix: resolve conflito de merge`.

---

## Regras de Código

* **Idioma:** nomes de funções e variáveis em português, em camelCase, como `criarTwingo`, `habilitarControles`, `luzesFarois`.
* **Constantes de ajuste:** em MAIÚSCULAS com `_`, declaradas no topo da função que as usa, como `VEL_MAXIMA` e `VOLANTE_RETORNO`.
* **Comentários:** em português, **sem acento e sem caracteres especiais** (`eh`, `nao`, `capo`, `direcao`).
* **Arquivos novos:** nomes em kebab-case ou em uma palavra minúscula, sem acento, dentro de `codigo-base/src/`.
* **Relatórios:** ficam em `docs/relatorios/` com o nome `Projeto_Final_ParteN.pdf`. Não altere esses arquivos sem pedido do grupo.
