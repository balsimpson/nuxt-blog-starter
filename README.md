# 🚀 Nuxt Blog Starter

A premium, high-performance blog starter built with **Nuxt 4**, **Nuxt UI**, **Clerk Auth**, and **Convex**. Designed for developers who want a seamless writing experience and a stunning frontend out of the box.

![Nuxt Blog Starter](https://ui.nuxt.com/assets/templates/nuxt/starter-dark.png)

## ✨ Features

- **Framework**: [Nuxt 4](https://nuxt.com) for a modern Vue experience.
- **UI Components**: [Nuxt UI](https://ui.nuxt.com) for a beautiful, accessible interface.
- **Authentication**: [Clerk](https://clerk.com) for secure user management and admin protection.
- **Database & Backend**: [Convex](https://convex.dev) for real-time data and effortless backend functions.
- **Editor**: Built-in rich text editor for creating and publishing posts.
- **Styling**: Tailwind CSS 4 with a polished, dark-mode first aesthetic.

---

## 🛠️ Quick Start

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/nuxt-blog-starter.git

# Navigate to directory
cd nuxt-blog-starter

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Clerk Authentication
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
NUXT_CLERK_SECRET_KEY=your_secret_key

# Convex Backend
CONVEX_URL=your_convex_deployment_url

# Optional AI Article Generation
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
TAVILY_API_KEY=your_tavily_api_key
```

### 3. Initialize Convex

```bash
# Start Convex development server (this will push your schema and functions)
npx convex dev
```

### 4. Configure Clerk authentication in Convex

Create a Clerk JWT template named `convex`. Then add these values to the Convex
deployment under **Settings → Environment Variables**:

| Variable | Value |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | The Clerk issuer, such as `https://your-instance.clerk.accounts.dev` |
| `CLERK_SECRET_KEY` | The Clerk secret key for the same instance |
| `APP_URL` | The absolute app origin, such as `http://localhost:3000` locally or the production origin when deployed |

The secret must be configured in Convex itself. The Nuxt
`NUXT_CLERK_SECRET_KEY` variable is not automatically available to Convex
actions.

### 5. Run Locally

```bash
npm run dev
```

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push your code** to GitHub.
2. **Import the project** in Vercel.
3. **Add Environment Variables**:
   - `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NUXT_CLERK_SECRET_KEY`
   - `CONVEX_URL` (Found in your Convex Dashboard under Settings > Deployment URL)
4. **Deploy!**

> [!IMPORTANT]
> Make sure to add your production URL to the **Allowed Redirect URIs** in your Clerk Dashboard.

---

## 🔒 Bootstrap the first administrator

The first administrator is the only user bootstrapped from Clerk metadata:

1. In the Clerk Dashboard, open the user who will administer the app.
2. Add `{ "role": "admin" }` to either public or private metadata.
3. Sign in with that user and open `/admin`.
4. The app creates the first active Convex user as an admin.

This bootstrap is accepted only while the Convex `users` table is empty. After
that, Convex is the sole role source of truth and Clerk metadata cannot grant or
change application access.

## 👥 Invite and manage users

Administrators can open `/admin/users` to invite an email as a viewer, editor,
or admin.

- **Viewer**: can read the admin entry archive.
- **Editor**: can manage entries and use research and generation tools.
- **Admin**: has editor access and can manage users.

The access record is saved in Convex before Clerk attempts email delivery. The
recipient can accept the invitation or sign in directly with the same verified
email; both paths activate the same pending user record. If email delivery
fails, the assigned access remains saved.

Pending invitations can be resent or revoked. Active users can be disabled and
restored. Role changes take effect from the Convex record and do not require a
Clerk metadata or token update.

---

## 📖 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts development server on `localhost:3000` |
| `npm run build` | Builds the application for production |
| `npm run preview` | Locally preview the production build |
| `npm run test:access` | Runs role and route-policy tests |
| `npx convex dev` | Starts the Convex development sync |

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
