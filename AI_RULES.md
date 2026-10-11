# Project AI Rules

## Tech stack

- **React 19 + TypeScript**: Build UI with typed React components and hooks. Keep application source code under `src/`.
- **TanStack Start**: Use TanStack Start for the full-stack React application and server-aware rendering.
- **TanStack Router**: Define and organize routes with TanStack Router. Route files live under `src/routes/`; update the generated route tree through the project’s normal TanStack tooling rather than editing generated output by hand.
- **Vite**: Use Vite for local development and production bundling. Keep Vite-specific configuration in the existing project configuration files.
- **Tailwind CSS 4**: Use utility classes for layout, spacing, responsive behavior, typography, colors, borders, and visual states. Prefer existing design tokens and styles in `src/styles.css`.
- **shadcn/ui + Radix UI**: Use the existing components in `src/components/ui/` for accessible primitives such as buttons, dialogs, forms, menus, tabs, and tooltips. These components are built on Radix UI.
- **TanStack Query**: Use `@tanstack/react-query` for asynchronous server state, caching, loading states, and request synchronization.
- **Supabase**: Use the existing Supabase integration in `src/integrations/supabase/` for authentication and database access. Keep client and server usage separated according to the existing integration files.
- **Vitest + Testing Library**: Use Vitest and React Testing Library for unit, integration, and component tests. Keep tests near the relevant source or in `src/test/`.

## Library and implementation rules

- Use TypeScript for all new source files. Avoid introducing JavaScript unless a tool or configuration explicitly requires it.
- Use TanStack Router for navigation, route layouts, route loaders, and route-level access control. Do not add a second routing library or use ad hoc `window.location` navigation for in-app routes.
- Put route components in `src/routes/`, reusable visual components in `src/components/`, shared hooks in `src/hooks/`, and domain-independent helpers in `src/lib/`.
- Use the existing shadcn/ui components before creating new primitives. Do not edit files in `src/components/ui/` unless a task explicitly requires changing the shared component implementation; compose them in new components instead.
- Use Radix UI through the existing shadcn/ui wrappers for accessible dialogs, popovers, menus, dropdowns, tooltips, forms, and other interactive primitives. Do not replace them with inaccessible custom implementations.
- Use Tailwind CSS classes for styling. Use `cn` from `src/lib/utils.ts` when conditional class composition or Tailwind class merging is needed. Avoid adding one-off CSS when utilities or existing tokens are sufficient.
- Use `lucide-react` for interface icons. Do not add a new icon library or use manually drawn SVG icons unless a product-specific graphic is required.
- Use `react-hook-form` with `zod` schemas and `@hookform/resolvers` for non-trivial forms, validation, and typed form errors. Keep validation at user-input and external-service boundaries.
- Use `date-fns` for date formatting and date calculations rather than manually manipulating date strings.
- Use TanStack Query for remote/server state; use React state or small existing store utilities only for local UI state. Do not duplicate server data in unrelated local state.
- Use Supabase helpers and generated types from `src/integrations/supabase/` for Supabase operations. Do not expose secrets in client code or hard-code credentials.
- Use `sonner` through the existing toast component for transient success and error notifications. Keep important validation and recovery messages visible in the relevant UI as well.
- Add tests with Vitest and Testing Library for new business logic, route behavior, and meaningful user interactions. Prefer accessible queries such as role, label, and text.
- Keep `src/routeTree.gen.ts` generated. Make route changes in route files and let the project tooling regenerate derived route metadata.
- Keep changes focused on the requested feature. Do not add dependencies when an installed library or existing component already solves the problem.
