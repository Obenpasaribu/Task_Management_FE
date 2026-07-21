# Arsitektur Task Management App

## 1. Tech Stack

| Layer           | Teknologi                                                                           |
| --------------- | ----------------------------------------------------------------------------------- |
| Frontend        | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Axios, Next Middleware |
| Backend         | Golang + Gin                                                                        |
| ORM             | GORM                                                                                |
| Migration       | GORM AutoMigrate                                                                    |
| Database        | PostgreSQL                                                                          |
| Auth            | JWT (golang-jwt)                                                                    |
| AI Integration  | OpenAI API via Sumopod Gateway (https://ai.sumopod.com/v1/chat/completions)         |
| Dokumentasi API | Postman Collection                                                                  |
| ERD             | dbdiagram.io                                                                        |

---

## 2. Arsitektur Database (PostgreSQL + GORM)

### 2.1 Skema Tabel Saat Ini

Backend saat ini memakai PostgreSQL dengan koneksi GORM. Struktur tabel utama dibuat lewat `AutoMigrate` di `config/database.go`, sehingga skema disinkronkan langsung dari model Go.

**users**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL PK | primary key |
| name | VARCHAR(100) | nama user |
| email | VARCHAR(100) UNIQUE | email login |
| password_hash | VARCHAR(255) | hasil hash bcrypt |
| role | VARCHAR(50) | `admin`, `lead`, `employee` |
| status | VARCHAR(50) | `active`, `inactive` |

**tasks**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL PK | primary key |
| title | VARCHAR(150) | judul task |
| description | TEXT | deskripsi task |
| status | VARCHAR(20) | `todo`, `in_progress`, `done` |
| deadline | TIMESTAMP | batas waktu |
| assignee_id | INTEGER FK -> users(id) | penanggung jawab |
| created_by | INTEGER FK -> users(id) | pembuat task |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

**teams**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL PK | primary key |
| name | VARCHAR(100) | nama tim |
| description | TEXT | deskripsi tim |
| lead_id | INTEGER FK -> users(id) | pemimpin tim |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

**team_members**
| Kolom | Tipe | Keterangan |
|---|---|---|
| team_id | INTEGER PK/FK | relasi ke teams |
| user_id | INTEGER PK/FK | relasi ke users |

**resources, permissions, roles, role_permissions, user_roles**
| Tabel | Fungsi |
|---|---|
| resources | nama resource yang diproteksi, contoh `tasks`, `teams` |
| permissions | action per resource, contoh `view`, `create`, `update`, `delete` |
| roles | role sistem seperti `admin`, `lead`, `employee` |
| role_permissions | mapping role ke permission |
| user_roles | mapping user ke role |

**Relasi utama:**

- satu user bisa memiliki banyak task sebagai assignee atau creator.
- satu team memiliki satu lead dan banyak member.
- role dan permission dipakai untuk sistem RBAC.

### 2.2 Migrasi Database

Implementasi backend saat ini mengandalkan `AutoMigrate` lewat GORM. Skema utama didefinisikan di model Go (`models/user.go`, `models/task.go`, `models/team.go`, `models/rbac.go`) dan disinkronkan otomatis saat aplikasi start di `config/database.go`.

```
backend/
├── migrations/          # folder SQL migration (opsional, untuk dokumentasi)
│   ├── 000001_create_users_table.up.sql
│   └── ...
├── models/
│   ├── user.go
│   ├── task.go
│   ├── team.go
│   └── rbac.go
└── config/
    └── database.go      # AutoMigrate dipanggil di sini
```

**Keuntungan pendekatan AutoMigrate:**

- Skema terintegrasi langsung di kode model
- Perubahan model otomatis diskema saat run
- Tidak perlu maintain file SQL terpisah

### 2.3 Koneksi Database dan Environment Variables

Backend menggunakan file `.env` untuk konfigurasi database dan API integration:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=db_Task
JWT_SECRET=supersecretkey
JWT_EXPIRATION_MINUTES=60
OPENAI_API_KEY=sk-pn_Z9...
```

Connection string yang terbentuk:

```text
host=<DB_HOST> user=<DB_USERNAME> password=<DB_PASSWORD> dbname=<DB_DATABASE> port=<DB_PORT> sslmode=disable
```

Implementasi saat ini ada di `config/database.go`:

```go
func ConnectDB() (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_DATABASE"),
		os.Getenv("DB_PORT"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.User{}, &models.Task{}, &models.Team{}, &models.TeamMember{}, &models.Resource{}, &models.Permission{}, &models.Role{}, &models.RolePermission{}, &models.UserRole{}); err != nil {
		return nil, err
	}

	return db, nil
}
```

---

## 3. Arsitektur Backend (Golang + Gin)

### 3.1 Struktur Folder Saat Ini

```
backend/
├── cmd/
│   └── main.go
├── config/
│   ├── config.go
│   ├── database.go
│   └── seed.go
├── models/
│   ├── user.go
│   ├── task.go
│   ├── team.go
│   └── rbac.go
├── dto/
│   ├── task_dto.go
│   ├── team_dto.go
│   └── user_dto.go
├── repositories/
│   ├── task_repository.go
│   ├── team_repository.go
│   └── user_repository.go
├── services/
│   ├── auth_service.go
│   ├── task_service.go
│   ├── team_service.go
│   ├── user_service.go
│   ├── chatbot_service.go          # AI chatbot service dengan OpenAI API
│   └── user_reactivate_request.go
├── handlers/
│   ├── auth_handler.go
│   ├── handlers.go
│   ├── task_handler.go
│   ├── team_handler.go
│   ├── user_handler.go
│   ├── role_handler.go
│   ├── resource_handler.go
│   ├── permission_handler.go
│   ├── user_role_handler.go
│   └── chatbot_handler.go          # HTTP handler untuk chatbot endpoint
├── routes/
│   └── routes.go
├── middlewares/
│   ├── jwt_middleware.go
│   └── permission_middleware.go
├── utils/
│   ├── jwt.go
│   └── hash.go
└── migrations/
```

**Pola arsitektur:** Layered Architecture — `Route → Handler → Service → Repository → Model`. Struktur ini dipakai untuk memisahkan autentikasi, business logic, data access, dan model domain.

**Flow startup backend saat ini:**

1. `cmd/main.go` memuat environment dari `.env`.
2. `config.ConnectDB()` membuka koneksi PostgreSQL dan menjalankan `AutoMigrate` untuk semua model utama.
3. `config.SeedDefaultUser()` memeriksa dan membuat user default `admin@example.com` bila belum ada.
4. Handler dan route diinisialisasi, lalu server berjalan di port `8000`.

### 3.2 Contoh Implementasi Saat Ini

`models/user.go`

```go
type User struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	Name         string `gorm:"size:100;not null" json:"name"`
	Email        string `gorm:"size:100;not null;unique" json:"email"`
	PasswordHash string `gorm:"size:255;not null" json:"-"`
	Role         string `gorm:"size:50;not null;default:'employee'" json:"role"`
	Status       string `gorm:"size:50;not null;default:'active'" json:"status"`
}
```

`routes/routes.go`

```go
func SetupRoutes(r *gin.Engine, h *handlers.Handlers) {
	api := r.Group("/api/v1")

	api.POST("/auth/login", h.Auth.Login)
	api.POST("/auth/register", h.Auth.Register)
	api.POST("/auth/signup", h.Auth.Register)
	api.POST("/register", h.Auth.Register)
	api.POST("/users/register", h.Auth.Register)
	api.POST("/auth/users", h.Auth.Register)

	protected := api.Group("/")
	protected.Use(middlewares.JWTMiddleware())
	{
		protected.GET("/users", h.User.GetAll)
		protected.GET("/users/:id", h.User.GetByID)
		protected.PUT("/users/:id", h.User.Update)
		protected.DELETE("/users/:id", h.User.Deactivate)
		protected.POST("/users/:id/reactivate", h.User.Reactivate)

		protected.GET("/teams", h.Team.GetAll)
		protected.GET("/teams/my", h.Team.GetMine)
		protected.GET("/teams/:id", h.Team.GetByID)
		protected.POST("/teams", h.Team.Create)
		protected.PUT("/teams/:id", h.Team.Update)
		protected.DELETE("/teams/:id", h.Team.Delete)

		protected.POST("/admin/roles", h.Role.Create)
		protected.GET("/admin/roles", h.Role.List)
		protected.POST("/admin/resources", h.Resource.Create)
		protected.GET("/admin/resources", h.Resource.List)
		protected.POST("/admin/permissions", h.Permission.Create)
		protected.GET("/admin/permissions", h.Permission.List)
		protected.POST("/admin/permissions/assign", h.Permission.AssignToRole)
		protected.POST("/admin/user-roles", h.UserRole.Assign)

		protected.GET("/tasks", h.Task.GetAll)
		protected.POST("/tasks", h.Task.Create)
		protected.GET("/tasks/:id", h.Task.GetByID)
		protected.PUT("/tasks/:id", h.Task.Update)
		protected.PATCH("/tasks/:id/status", h.Task.UpdateStatus)
		protected.DELETE("/tasks/:id", h.Task.Delete)

		protected.POST("/chatbot", h.Chatbot.Ask)
	}
}
```

Library utama yang dipakai:

- `github.com/gin-gonic/gin` — HTTP framework
- `gorm.io/gorm` + `gorm.io/driver/postgres` — ORM
- `github.com/golang-jwt/jwt/v5` — JWT auth
- `golang.org/x/crypto/bcrypt` — password hashing
- `github.com/joho/godotenv` — load `.env`

### 3.3 Endpoint Backend Saat Ini

| Method | Endpoint                           | Fungsi                    | Auth |
| ------ | ---------------------------------- | ------------------------- | ---- |
| POST   | `/api/v1/auth/login`               | login user                | -    |
| POST   | `/api/v1/auth/register`            | register user             | -    |
| GET    | `/api/v1/users`                    | daftar user               | JWT  |
| GET    | `/api/v1/users/:id`                | detail user               | JWT  |
| PUT    | `/api/v1/users/:id`                | update user               | JWT  |
| DELETE | `/api/v1/users/:id`                | deactivate user           | JWT  |
| POST   | `/api/v1/users/:id/reactivate`     | reactivate user           | JWT  |
| GET    | `/api/v1/teams`                    | daftar team               | JWT  |
| GET    | `/api/v1/teams/my`                 | team milik user login     | JWT  |
| POST   | `/api/v1/teams`                    | tambah team               | JWT  |
| PUT    | `/api/v1/teams/:id`                | update team               | JWT  |
| DELETE | `/api/v1/teams/:id`                | hapus team                | JWT  |
| POST   | `/api/v1/admin/roles`              | buat role                 | JWT  |
| GET    | `/api/v1/admin/roles`              | daftar role               | JWT  |
| POST   | `/api/v1/admin/resources`          | buat resource             | JWT  |
| GET    | `/api/v1/admin/resources`          | daftar resource           | JWT  |
| POST   | `/api/v1/admin/permissions`        | buat permission           | JWT  |
| GET    | `/api/v1/admin/permissions`        | daftar permission         | JWT  |
| POST   | `/api/v1/admin/permissions/assign` | assign permission ke role | JWT  |
| POST   | `/api/v1/admin/user-roles`         | assign role ke user       | JWT  |
| GET    | `/api/v1/tasks`                    | daftar task               | JWT  |
| POST   | `/api/v1/tasks`                    | tambah task               | JWT  |
| GET    | `/api/v1/tasks/:id`                | detail task               | JWT  |
| PUT    | `/api/v1/tasks/:id`                | update task               | JWT  |
| PATCH  | `/api/v1/tasks/:id/status`         | update status task        | JWT  |
| DELETE | `/api/v1/tasks/:id`                | hapus task                | JWT  |
| POST   | `/api/v1/chatbot`                  | tanya jawab chatbot AI    | JWT  |

### 3.4 Alur Auth, RBAC, dan Chatbot

#### Authentication & Authorization

1. User login/register melalui endpoint auth.
2. Backend memvalidasi password, lalu menghasilkan JWT menggunakan `utils/jwt.go`.
3. Setiap request protected wajib membawa `Authorization: Bearer <token>`.
4. `middlewares/jwt_middleware.go` memverifikasi token dan menyimpan `user_id` ke context Gin.
5. `middlewares/permission_middleware.go` dapat memeriksa permission user terhadap resource/action tertentu untuk endpoint yang perlu proteksi tambahan.
6. Sistem ini mendukung role-based access control melalui tabel `roles`, `resources`, `permissions`, `role_permissions`, dan `user_roles`.

#### Chatbot Integration

1. Frontend mengirim pertanyaan user ke `POST /api/v1/chatbot` dengan JWT token.
2. `handlers/chatbot_handler.go` menerima request dan memanggil `ChatbotService.AskChatbot()`.
3. `ChatbotService` di `services/chatbot_service.go` menyiapkan messages dan tool definitions, lalu memanggil AI gateway `https://ai.sumopod.com/v1/chat/completions` dengan `OPENAI_API_KEY`.
4. Tools yang tersedia untuk LLM:
   - `get_tasks_by_status`: Query task berdasarkan status dari `TaskRepository`
   - `count_tasks_by_status`: Hitung jumlah task per status
   - `get_tasks_due_today`: Ambil task dengan deadline hari ini
   - `get_assignee_by_task_title`: Cari assignee dari task tertentu
5. AI memproses tool calls dan menghasilkan response natural language yang di-return ke frontend.
6. `repositories/task_repository.go` menyediakan method-method untuk mengakses data task yang dibutuhkan chatbot.

**Arsitektur Chatbot:**

```
[Frontend: ChatbotWidget]
    ↓ (POST /api/v1/chatbot dengan JWT)
[Handler: chatbot_handler.Ask]
    ↓
[Service: ChatbotService.AskChatbot]
    ↓
[AI Gateway: callOpenAI] ← (OPENAI_API_KEY)
    ↓ (tool definitions)
[LLM Response dengan tool calls]
    ↓
[ExecuteFunction mapping ke TaskRepository]
    ↓ (data hasil)
[AI Final Response]
    ↓
[Frontend: Display Answer]
```

---

## 4. Arsitektur Frontend (Next.js)

### 4.1 Struktur Folder Saat Ini

```
Task_Management_FE/
├── app/
│   ├── api/
│   │   └── proxy/
│   │       └── [...path]/
│   │           └── route.ts         # proxy request ke backend
│   ├── layout.tsx                   # root layout dengan ChatbotWidget
│   ├── page.tsx                     # redirect ke /tasks
│   ├── login/
│   │   └── page.tsx
│   ├── tasks/
│   │   ├── page.tsx                 # daftar task
│   │   ├── new/
│   │   │   └── page.tsx             # form tambah task
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx         # form edit task
│   ├── team/
│   │   └── page.tsx
│   ├── team-task/
│   │   └── page.tsx
│   ├── user-management/
│   │   └── page.tsx
│   └── resources/
│       └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── MainContent.tsx
│   ├── PermissionGuard.tsx
│   ├── ChatbotWidget.tsx            # floating chat widget dengan AI assistant
│   ├── TaskCard.tsx
│   ├── TaskForm.tsx
│   ├── TaskTable.tsx
│   ├── StatusBadge.tsx
│   └── AssigneeDropdown.tsx
├── context/
│   ├── AuthContext.tsx
│   ├── UserContext.tsx
│   └── SidebarContext.tsx
├── hooks/
│   ├── useTasks.ts
│   ├── useTeams.ts
│   ├── useUsers.ts
│   └── useChatbot.ts                # hook untuk komunikasi dengan chatbot API
├── lib/
│   ├── api.ts                       # axios instance + interceptor JWT
│   ├── auth.ts                      # simpan/ambil token dari storage
│   ├── mockData.ts                  # fallback data lokal
│   └── permissions.ts               # matrix permission per role
├── types/
│   ├── permission.ts
│   ├── task.ts
│   ├── team.ts
│   └── user.ts
├── middleware.ts                    # proteksi route dasar
└── package.json
```

### 4.2 Alur Frontend Saat Ini

1. Halaman login mengirim credential ke backend melalui axios instance yang sudah terkonfigurasi dengan JWT interceptor.
2. Token hasil login disimpan ke localStorage dan cookie, lalu dipakai oleh `AuthContext` untuk mengatur status autentikasi aplikasi.
3. Semua request ke backend lewat `lib/api.ts` dan route proxy di `app/api/proxy/[...path]/route.ts`, sehingga frontend bisa memanggil endpoint backend tanpa masalah CORS.
4. Halaman seperti tasks, team, team-task, user-management, dan resources mengambil data lewat custom hooks (`useTasks`, `useTeams`, `useUsers`) yang juga menyediakan fallback data lokal dari `lib/mockData.ts` bila backend sedang tidak tersedia.
5. Informasi user yang sedang login di-manage oleh `UserContext`, sedangkan state sidebar disimpan di `SidebarContext`.
6. Navbar menampilkan menu berdasarkan role user melalui permission matrix di `lib/permissions.ts`. Komponen `PermissionGuard` dipakai untuk membatasi akses UI sesuai izin.
7. Middleware memeriksa token saat user mengakses route yang diproteksi, dan akan mengarahkan ke `/login` bila belum login.

### 4.3 State Management

Saat ini frontend memakai pendekatan yang sederhana namun cukup jelas:

- React Context untuk auth (`AuthContext`), user (`UserContext`), dan sidebar (`SidebarContext`).
- Custom hooks untuk fetching dan state domain (`useTasks`, `useTeams`, `useUsers`).
- localStorage untuk menyimpan token, data user, dan data lokal fallback.
- Tidak memakai Redux atau library state management global lain.

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

### 4.4 Fitur Chatbot (Task Assistant) - SUDAH DIIMPLEMENTASIKAN

Frontend sudah menyediakan UI chatbot berupa floating widget yang dapat diakses di semua halaman setelah login. Backend juga sudah menyediakan full implementation dengan AI integration.

**Frontend Components:**

- **Komponen:** `components/ChatbotWidget.tsx` - floating chat panel di pojok kanan bawah
- **Hook:** `hooks/useChatbot.ts` - mengelola komunikasi dengan backend endpoint chatbot
- **Endpoint:** `POST /api/v1/chatbot` - sudah tersedia di backend

**Backend Implementation:**

- **Handler:** `handlers/chatbot_handler.go` - menerima POST request dengan JWT token
- **Service:** `services/chatbot_service.go` - mengintegrasikan OpenAI API via Sumopod Gateway
- **Repository Methods:** `repositories/task_repository.go` menyediakan:
  - `GetByStatus(status)` - ambil task berdasarkan status
  - `CountByStatus(status)` - hitung jumlah task per status
  - `GetDueToday()` - ambil task dengan deadline hari ini
  - `GetAssigneeByTitle(title)` - cari assignee dari task berdasarkan judul

**AI Gateway Configuration:**

- URL: `https://ai.sumopod.com/v1/chat/completions`
- Model: `gpt-4o-mini`
- Auth: Bearer token via `OPENAI_API_KEY` di `.env`
- Tool calling support untuk function execution di backend

**Alur End-to-End:**

1. User mengirim pertanyaan via ChatbotWidget → `POST /api/v1/chatbot`
2. Handler memvalidasi JWT token dan forward ke ChatbotService
3. Service mengirim message + tool definitions ke AI Gateway
4. AI menganalisis pertanyaan dan membuat tool calls jika diperlukan
5. Service execute function calls ke TaskRepository untuk ambil data
6. Service kirim hasil data ke AI untuk proses lebih lanjut
7. AI generate final response dalam natural language
8. Response di-return ke frontend untuk display di ChatbotWidget

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
