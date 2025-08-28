# FollowerTrackCreator Web

Uma aplicação web para criação e visualização de pistas para robôs seguidores de linha usando a linguagem LFDL (Line Follower Description Language).

## 🚀 Características

- **Editor Monaco**: Syntax highlighting e autocomplete para LFDL
- **Renderização em tempo real**: Visualização instantânea da pista com p5.js
- **DSL intuitiva**: Comandos simples em inglês (`straight`, `arc`)
- **Validação automática**: Verificação das regras da RoboCore
- **Deploy simples**: Aplicação estática sem build tools

## 📋 Como usar

1. **Abra o arquivo `index.html` no navegador**
2. **Escreva código LFDL no editor**:
   ```lfdl
   @size 600 400
   @start 100 100 0

   straight 200
   arc r 100 90
   straight 100
   ```
3. **Veja a pista sendo renderizada automaticamente**

## 📝 Sintaxe LFDL

### Diretivas de Configuração
- `@size <largura> <altura>` - Define o tamanho do canvas
- `@start <x> <y> <ângulo>` - Define posição e orientação inicial

### Comandos de Desenho
- `straight <distância>` - Desenha linha reta em mm
- `arc <l|r> <raio> <ângulo>` - Desenha arco (esquerda/direita)

### Exemplo Completo
```lfdl
# Pista retangular simples
@size 600 400
@start 200 50 0

straight 200
arc r 100 90
straight 100
arc r 100 90
straight 200
arc r 100 90
straight 100
arc r 100 90
```

## 🛠️ Estrutura do Projeto

```
/
├── index.html              # Página principal
├── css/
│   └── style.css          # Estilos da aplicação
├── js/
│   ├── main.js            # Aplicação principal
│   ├── parser.js          # Parser LFDL
│   ├── renderer.js        # Renderização com p5.js
│   ├── validator.js       # Validação de pistas
│   └── editor.js          # Integração Monaco Editor
└── docs/                  # Documentação adicional
```

## 🎯 Regras da RoboCore

O sistema implementa automaticamente:
- ✅ Raio mínimo de arcos: 100mm
- ✅ Largura da linha: 19mm
- ✅ Comprimento máximo: 60m (Pro), 20m (Junior)
- ✅ Marcadores entre segmentos
- ✅ Indicadores visuais de início/fim

## 🖥️ Requisitos

- Navegador moderno com suporte a ES6 modules
- Conexão com internet (para CDN do Monaco Editor)

## 📊 Validação

O sistema valida automaticamente:
- Sintaxe dos comandos LFDL
- Regras da RoboCore (raios, comprimentos)
- Categorias Junior/Pro
- Estatísticas da pista (comandos, comprimento, complexidade)

## 🎨 Editor

O Monaco Editor fornece:
- **Syntax highlighting** para comandos LFDL
- **Autocomplete inteligente** com snippets
- **Validação em tempo real**
- **Tema escuro** otimizado para LFDL

