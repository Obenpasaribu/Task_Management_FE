# Arsitektur Task Management App

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js (React), TypeScript, Tailwind CSS, Axios/Fetch |
| Backend | Golang + Gin |
| ORM | GORM |
| Migration | golang-migrate |
| Database | PostgreSQL |
| Auth | JWT (golang-jwt) |
| Dokumentasi API | Postman Collection |
| ERD | dbdiagram.io |

---

## 2. Arsitektur Database (PostgreSQL + Migration)

### 2.1 Skema Tabel

**users**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID / SERIAL PK | |
| name | VARCHAR(100) | nama user |
| email | VARCHAR(100) UNIQUE | untuk login |
| password_hash | VARCHAR(255) | hashed password |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

**tasks**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID / SERIAL PK | |
| title | VARCHAR(150) | judul task |
| description | TEXT | deskripsi |
| status | VARCHAR(20) / ENUM | 'todo', 'in_progress', 'done' |
| deadline | DATE / TIMESTAMP | |
| assignee_id | INTEGER FK -> users(id) | penanggung jawab |
| created_by | INTEGER FK -> users(id) | siapa yang buat task |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

**Relasi:** satu `user` bisa memiliki banyak `task` sebagai assignee (1 - N). Ini relasi yang wajib ada sesuai requirement.

### 2.2 Struktur folder migration (golang-migrate)

```
backend/
└── migrations/
    ├── 000001_create_users_table.up.sql
    ├── 000001_create_users_table.down.sql
    ├── 000002_create_tasks_table.up.sql
    ├── 000002_create_tasks_table.down.sql
    ├── 000003_add_indexes.up.sql
    └── 000003_add_indexes.down.sql
```

Install tool migrate:
```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

### 2.3 Contoh migration `000001_create_users_table.up.sql`

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

`000001_create_users_table.down.sql`
```sql
DROP TABLE IF EXISTS users;
```

### 2.4 Contoh migration `000002_create_tasks_table.up.sql`

```sql
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    deadline DATE,
    assignee_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

`000002_create_tasks_table.down.sql`
```sql
DROP TABLE IF EXISTS tasks;
DROP TYPE IF EXISTS task_status;
```

### 2.5 Koneksi database (pakai .env kamu)

Connection string yang terbentuk:
```
postgresql://postgres:postgres@127.0.0.1:5432/db_Task?sslmode=disable
```

`config/database.go`:
```go
package config

import (
	"fmt"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectDB() (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_DATABASE"),
		os.Getenv("DB_PORT"),
	)
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
```

Perintah migration:
```bash
migrate create -ext sql -dir migrations -seq create_users_table
migrate -path migrations -database "postgresql://postgres:postgres@127.0.0.1:5432/db_Task?sslmode=disable" up
```

---

## 3. Arsitektur Backend (Golang + Gin)

### 3.1 Struktur Folder

```
backend/
├── cmd/
│   └── main.go                    # entry point
├── config/
│   ├── config.go                  # load .env
│   └── database.go                # koneksi GORM
├── models/
│   ├── user.go                    # struct User (GORM model)
│   └── task.go                    # struct Task
├── dto/
│   ├── user_dto.go                # request/response schema
│   └── task_dto.go
├── repositories/
│   ├── user_repository.go         # query DB (interface + impl)
│   └── task_repository.go
├── services/
│   ├── auth_service.go            # business logic login
│   └── task_service.go            # business logic task
├── handlers/
│   ├── auth_handler.go            # controller /login
│   ├── user_handler.go            # controller /users
│   └── task_handler.go            # controller /tasks
├── routes/
│   └── routes.go                  # setup semua route
├── middlewares/
│   └── jwt_middleware.go          # verifikasi JWT
├── utils/
│   ├── jwt.go                     # generate & parse token
│   └── hash.go                    # bcrypt password
├── migrations/                    # golang-migrate files
├── go.mod
├── go.sum
└── .env
```

**Pola arsitektur:** Layered Architecture — `Route → Handler (controller) → Service (business logic) → Repository (akses DB via GORM) → Model`. Pola ini membuat kode modular, gampang di-mock untuk testing, dan sesuai kriteria penilaian "struktur kode rapi & readable".

### 3.2 Contoh potongan kode

`models/task.go`
```go
package models

import "time"

type Task struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"size:150;not null" json:"title"`
	Description string    `json:"description"`
	Status      string    `gorm:"size:20;default:'todo'" json:"status"`
	Deadline    *time.Time `json:"deadline"`
	AssigneeID  *uint     `json:"assignee_id"`
	Assignee    *User     `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	CreatedBy   *uint     `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
```

`routes/routes.go` (garis besar)
```go
func SetupRoutes(r *gin.Engine, h *handlers.Handlers) {
	api := r.Group("/api/v1")

	api.POST("/auth/login", h.Auth.Login)

	protected := api.Group("/")
	protected.Use(middlewares.JWTMiddleware())
	{
		protected.GET("/users", h.User.GetAll)

		protected.GET("/tasks", h.Task.GetAll)
		protected.POST("/tasks", h.Task.Create)
		protected.GET("/tasks/:id", h.Task.GetByID)
		protected.PUT("/tasks/:id", h.Task.Update)
		protected.PATCH("/tasks/:id/status", h.Task.UpdateStatus)
		protected.DELETE("/tasks/:id", h.Task.Delete)
	}
}
```

Library utama yang dipakai:
- `github.com/gin-gonic/gin` — HTTP framework
- `gorm.io/gorm` + `gorm.io/driver/postgres` — ORM
- `github.com/golang-jwt/jwt/v5` — JWT
- `golang.org/x/crypto/bcrypt` — hash password
- `github.com/joho/godotenv` — load `.env`
- `github.com/golang-migrate/migrate/v4` — migration

### 3.3 Endpoint yang dibutuhkan

| Method | Endpoint | Fungsi | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/login` | login, return JWT | - |
| GET | `/api/v1/users` | daftar user (untuk dropdown assignee) | JWT |
| GET | `/api/v1/tasks` | list semua task | JWT |
| POST | `/api/v1/tasks` | tambah task | JWT |
| GET | `/api/v1/tasks/{id}` | detail task | JWT |
| PUT | `/api/v1/tasks/{id}` | edit task | JWT |
| PATCH | `/api/v1/tasks/{id}/status` | update status saja | JWT |
| DELETE | `/api/v1/tasks/{id}` | hapus task | JWT |
| POST | `/api/v1/chat` | (bonus) chatbot query task | JWT |

### 3.4 Alur Auth (JWT)

1. User login → `POST /auth/login` dengan email/password (bisa hardcode/seed 1-2 user awal via migration atau seeder terpisah).
2. Backend verifikasi password (bcrypt compare) → generate JWT pakai `golang-jwt` (access token, expiry misal 1 jam), payload berisi `user_id` & `email`.
3. Frontend simpan token (cookie httpOnly atau localStorage untuk simplicity).
4. Setiap request ke endpoint task/user disertakan header `Authorization: Bearer <token>`.
5. `middlewares/jwt_middleware.go` memverifikasi token di setiap request ke route yang protected, lalu inject `user_id` ke context Gin.

---

## 4. Arsitektur Frontend (Next.js)

### 4.1 Struktur Folder (App Router)

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # redirect ke /login atau /tasks
│   ├── login/
│   │   └── page.tsx
│   └── tasks/
│       ├── page.tsx              # list task
│       ├── new/
│       │   └── page.tsx          # form tambah task
│       └── [id]/
│           └── edit/
│               └── page.tsx      # form edit task
├── components/
│   ├── TaskCard.tsx
│   ├── TaskForm.tsx
│   ├── TaskTable.tsx
│   ├── StatusBadge.tsx
│   ├── AssigneeDropdown.tsx
│   └── Navbar.tsx
├── lib/
│   ├── api.ts                    # axios instance + interceptor JWT
│   └── auth.ts                   # simpan/ambil token
├── hooks/
│   ├── useTasks.ts
│   └── useUsers.ts
├── context/
│   └── AuthContext.tsx
├── types/
│   ├── task.ts
│   └── user.ts
├── middleware.ts                 # proteksi route (redirect kalau belum login)
└── .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4.2 Alur Frontend

1. **Login page** → submit ke `/api/v1/auth/login` → simpan JWT → redirect ke `/tasks`.
2. **Tasks page** → fetch `/api/v1/tasks` + fetch `/api/v1/users` (untuk dropdown assignee) → tampilkan tabel/list.
3. **Tambah/Edit task** → form dengan field judul, deskripsi, status (select), deadline (date picker), assignee (dropdown dari data user).
4. **Update status** → bisa langsung dari dropdown/badge di tabel task (PATCH request).
5. **Hapus task** → konfirmasi dulu (modal), lalu DELETE request.
6. **Middleware** cek token; kalau tidak ada, redirect ke `/login`.

### 4.3 State Management
Untuk aplikasi sesederhana ini, cukup pakai React Context (AuthContext) + custom hooks (useTasks, useUsers) dengan fetch/SWR/React Query. Tidak perlu Redux.

---

## 5. Diagram Alur Sistem (High Level)

```
[Browser: Next.js FE]
     |  (JWT di header)
     v
[Golang BE: Route -> Handler -> Service -> Repository]
     |
     v
[PostgreSQL: users, tasks]
```

Chatbot (bonus) akan menjadi service tambahan di backend yang mengambil data task dari repository, lalu mengirim ke LLM (OpenAI/Gemini) sebagai context untuk menjawab pertanyaan user.

---

## 6. Urutan Pengerjaan yang Disarankan

1. Setup database + migration (users, tasks) dengan golang-migrate.
2. Buat backend Go: model → repository → service → handler → route, mulai dari auth (login + JWT) lalu CRUD task.
3. Seed data user awal (untuk login & dropdown assignee) — bisa lewat migration tambahan atau script seeder.
4. Test semua endpoint di Postman, buat collection-nya sekalian.
5. Buat frontend: login page dulu, lalu task list, lalu form tambah/edit.
6. Hubungkan FE-BE, test end-to-end.
7. Buat ERD di dbdiagram.io.
8. (Bonus) Tambah fitur chatbot.
9. Tulis README.

---

Kalau kamu mau, saya bisa lanjut buatkan kode nyata (folder + file) untuk backend, frontend, atau migration-nya langsung — beri tahu saya mau mulai dari bagian mana.
