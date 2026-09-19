# ClinicFlow AI

Crie o sistema de gestão de clínicas ClinicFlow AI (baseado na estrutura do repositório rgama75/estetica).

O sistema é um SaaS multi-tenant para clínicas de estética e saúde com:
1. Autenticação e Perfis (Login, Cadastro e recuperação de acesso).
2. Onboarding guiado: criação da organização/clínica (nome fantasia, razão social, documento/CNPJ, especialidade estética/odontologia/medicina, telefone, endereço) com criação automática da unidade matriz.
3. AppShell profissional e responsivo com navegação lateral:
   - Dashboard com métricas resumidas e checklist de configuração inicial (dados da clínica, unidades criadas, membros na equipe).
   - Módulos do menu: Agenda, CRM, Pacientes, Avaliações, Propostas, Vendas, Pacotes, Assinaturas, Financeiro, Automações e Relatórios.
   - Gestão de Equipe e Permissões (membros, cargos/papéis como Administrador, Profissional, Recepcionista).
   - Configurações da Organização e CRUD de Unidades/Filiais.
4. Cabeçalho com seletor de organização, visualização do usuário logado e opção de alternar unidades.
5. Layout moderno, refinado e com paleta de cores limpa apropriada para o setor de saúde e estética.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://clinics-system.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2a940649-fe77-4edb-8bd6-5ae7f3d8168a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
