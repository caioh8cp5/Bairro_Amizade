# Plataforma Digital para Integração e Governança Comunitária: O Caso do Bairro Amizade

## Sobre o Projeto
Este projeto consiste em uma proposta de plataforma digital modular focada na centralização da gestão, comunicação e segurança para os moradores do **Bairro Amizade**, localizado em Jaraguá do Sul - SC. 

Diferente de soluções genéricas de mercado, o sistema foca em um ambiente estritamente privado, mitigando os problemas de perda de avisos importantes e exposição de dados residenciais associados ao uso de grupos de mensagens comuns (como WhatsApp) ou redes baseadas puramente em GPS (como Nextdoor).

---

## Funcionalidades Principais (Módulos)
*   **Módulo de Controle de Acesso (Whitelist):** Autenticação estrita baseada em uma lista de permissões pré-aprovada pela associação de moradores, impedindo acessos externos.
*   **Mural de Comunicados:** Espaço controlado e unidirecional para publicações oficiais urgentes por parte da administração.
*   **Agenda de Reuniões:** Calendário digital interativo para marcação de assembleias com confirmação de presença em tempo real.
*   **Seção de Achados e Perdidos:** Painel público interno para cadastro, categorização e busca indexada de itens perdidos na região.
*   **Fórum de Sugestões e Ideias:** Ouvidoria digitalizada para o envio de propostas de melhorias urbanas com sistema de votação unitária por morador.

---

## Arquitetura e Tecnologias Propostas
O projeto adota uma arquitetura Cliente-Servidor dividida de forma modular:

*   **Frontend (Interface):** Desenvolvido em **Python**, priorizando componentes leves, excelente desempenho em dispositivos móveis e foco em acessibilidade para todas as faixas etárias.
*   **Backend (API):** Estruturado em **Node.js** com o framework **Express** para gerenciamento seguro das rotas e requisições.
*   **Persistência e Infraestrutura (Serverless):**
    *   **Cloud Firestore (NoSQL):** Armazenamento de dados estruturados (perfis, atas, votações e histórico).
    *   **Firebase Cloud Storage:** Armazenamento de mídias físicas (fotos do mural de achados e perdidos), otimizando o consumo de banda.
    *   **Firebase Security Rules:** Camada nativa de segurança que valida se o ID do usuário está ativo na *whitelist* diretamente no servidor antes de liberar qualquer dado.

---

## Metodologia de Desenvolvimento
O desenvolvimento do portfólio segue as práticas do framework **Scrum**, utilizando iterações e ciclos incrementais (Sprints) de duas semanas. A modelagem do sistema é guiada por Engenharia de Software com diagramas UML de Casos de Uso e Diagramas de Classes para a validação das regras de negócio.

---
*Trabalho individual desenvolvido como requisito para a avaliação N3 (2026/1) - Engenharia de Software.*
