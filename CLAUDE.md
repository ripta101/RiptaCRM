# Project Context

This project is to build modular and highly customisable CRM application. The app module is build on React MFE/BFF technology, each epic is its own module.
All fields the frontline user records, and displays are configurable by a business admin.

# About Me

I am a technical engineer. My customer will be small to medium business company, needing CRM application. I prefer clear, jargon-free output.

# Rules

- Always ask clarifying questions before starting a complex task
- Show your plan and steps before executing
- Keep reports and summarise concise - bullet points over paragraphs
- The modules created must make sense as an epic level module that makes sense to business function e.g. Email, WebChat, Case Management - do not go crazy generating every single function as a module
- The modules must have its own MFE folder, and can be modified/deployed independently
- Database changes and sample data must have versioning
- Review and update README.md everytime you add/modify/remove modules and features
- All pages must be responsive, can be viewed in desktop computer, laptop, and mobile devices

# Project Structure

Follow standard MFE monorepo project structure:
- apps/ - top level folder for the MFEs
- packages/ - shared libraries across MFEs
- package.json - Workspace dependencies
- turbo.json / nx.json - Monorepo task orchestration
- tsconfig.json - Global typescript config

# Additional Instructions

- Proceed bash commands required for end-to-end verification without user approval, only ask input/feedback if a change of requirements required
- When I ask you to commit and push, proceed the bash commands without my approval
- You can proceed executing the bash commands required to meet the requirements without any approval
- You can proceed reading screenshots when verifying changes without any approval
