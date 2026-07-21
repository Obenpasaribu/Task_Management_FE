# Panduan Frontend Task Management

Dokumen ini menjelaskan cara penggunaan frontend aplikasi Task Management, bagaimana frontend berkomunikasi dengan backend, serta cara memahami respons yang diterima dari server.

---

## 1. Tujuan Panduan

Panduan ini membantu developer atau user yang menggunakan frontend untuk:

- menjalankan aplikasi frontend dengan benar
- login dan mengakses halaman yang diproteksi
- memahami alur pengiriman request ke backend
- memahami format respons API yang diterima frontend
- menangani error saat mengakses fitur

---

## 2. Teknologi yang Digunakan

Frontend ini dibangun dengan:

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Axios untuk pemanggilan API
- Next Middleware untuk proteksi route sederhana

---

## 3. Struktur Frontend yang Penting

Berikut folder utama yang sering dipakai saat mengembangkan atau menggunakan aplikasi ini:

- app/ : halaman utama aplikasi dan route Next.js
- components/ : komponen UI seperti navbar, form, tabel task
- context/ : state global untuk auth, user, dan sidebar
- hooks/ : hook custom untuk mengambil data seperti task, team, user
- lib/ : utilitas API, auth, mock data, dan permission
- types/ : tipe data TypeScript untuk task, user, team, permission

Folder yang paling penting untuk dipahami:

- app/login/page.tsx : halaman login dan register
- app/tasks/page.tsx : halaman daftar task
- app/tasks/new/page.tsx : halaman tambah task
- app/tasks/[id]/edit/page.tsx : halaman edit task
- lib/api.ts : pusat konfigurasi axios
- app/api/proxy/[...path]/route.ts : proxy request frontend ke backend
- middleware.ts : proteksi route berdasarkan token

---

## 4. Cara Menjalankan Frontend

### 4.1 Prasyarat

Pastikan sudah terinstall:

- Node.js
- npm atau pnpm

### 4.2 Install Dependency

Jalankan perintah berikut di root project:

```bash
npm install
```

### 4.3 Jalankan aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di:

```text
http://127.0.0.1:3001
```

### 4.4 Konfigurasi backend URL

Frontend akan memanggil backend melalui URL berikut:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Jika variabel tersebut tidak tersedia, default yang dipakai adalah:

```text
http://localhost:8000
```

---

## 5. Alur Penggunaan Aplikasi

### 5.1 Login

1. Buka halaman login di URL:

```text
http://127.0.0.1:3001/login
```

2. Masukkan email dan password.
3. Setelah login berhasil, frontend akan:
   - menyimpan token ke localStorage
   - menyimpan token juga ke cookie
   - mengarahkan user ke halaman task

Form login mengirim request ke endpoint backend:

```text
/api/v1/auth/login
```

### 5.2 Register akun baru

Di halaman login, user juga bisa memilih mode register untuk membuat akun baru.

Data yang dikirim saat register:

- name
- email
- password
- role

Role yang didukung:

- admin
- lead
- employee

### 5.3 Logout

Logout dilakukan dari navbar. Saat logout:

- token dihapus dari localStorage
- cookie token dihapus
- user state dibersihkan
- user diarahkan kembali ke halaman login

---

## 6. Cara Frontend Berkomunikasi dengan Backend

Frontend tidak memanggil backend langsung dari browser secara raw ke domain backend. Sebagai gantinya, frontend memakai proxy route yang ada di:

- app/api/proxy/[...path]/route.ts

Artinya:

- request dari frontend ke path seperti /api/proxy/xxx akan diteruskan ke backend
- token dari user juga dikirim otomatis lewat header Authorization

### 6.1 Base URL API

Konfigurasi axios ada di file:

- lib/api.ts

Contoh konfigurasi dasar:

```ts
const api = axios.create({
  baseURL:
    typeof window !== "undefined"
      ? "/api/proxy/"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### 6.2 Header Authorization

Setiap request otomatis menambahkan header Authorization jika token tersedia.

Contoh:

```ts
Authorization: Bearer<token>;
```

Token diambil dari localStorage melalui fungsi di:

- lib/auth.ts

---

## 7. Pola Pemanggilan API di Frontend

### 7.1 GET data

Contoh mengambil data task:

```ts
const { data } = await api.get("/api/v1/tasks");
```

### 7.2 POST data

Contoh membuat task baru:

```ts
const { data } = await api.post("/api/v1/tasks", payload);
```

### 7.3 PUT data

Contoh update task:

```ts
const { data } = await api.put(`/api/v1/tasks/${id}`, payload);
```

### 7.4 PATCH data

Contoh mengubah status task:

```ts
const { data } = await api.patch(`/api/v1/tasks/${id}/status`, {
  status,
});
```

### 7.5 DELETE data

Contoh menghapus task:

```ts
await api.delete(`/api/v1/tasks/${id}`);
```

---

## 8. Cara Membaca Respons dari Backend

Frontend menerima respons dalam bentuk objek atau array JSON dari backend.

### 8.1 Respons sukses

Contoh data task:

```json
[
  {
    "id": 1,
    "title": "Mengerjakan fitur login",
    "description": "Implementasi login dan auth",
    "status": "in_progress",
    "deadline": "2026-07-22T00:00:00Z",
    "assignee_id": 2,
    "created_by": 1
  }
]
```

Pada frontend, biasanya diakses lewat:

```ts
const { data } = await api.get("/api/v1/tasks");
```

### 8.2 Respons error

Backend biasanya mengembalikan error dengan status code dan message, misalnya:

```json
{
  "message": "Email atau password salah"
}
```

Pada frontend, error biasanya ditangani seperti ini:

```ts
try {
  const { data } = await api.get("/api/v1/tasks");
} catch (err: any) {
  console.error(err?.response?.data);
  console.error(err?.response?.status);
}
```

### 8.3 Format penanganan error yang umum dipakai

Di aplikasi ini, error biasanya diambil dari:

```ts
err?.response?.data?.message;
```

Sementara status HTTP bisa dilihat dari:

```ts
err?.response?.status;
```

---

## 9. Alur Fitur Utama di Frontend

### 9.1 Halaman Task

Halaman task ada di:

- app/tasks/page.tsx

Fitur yang tersedia:

- melihat daftar task
- filter berdasarkan status
- mengubah status task langsung dari tabel
- menghapus task
- membuka halaman edit task
- menambah task baru

### 9.2 Halaman Tambah Task

Halaman tambah task ada di:

- app/tasks/new/page.tsx

User bisa mengisi:

- judul task
- deskripsi
- status
- deadline
- assignee

### 9.3 Halaman Edit Task

Halaman edit task ada di:

- app/tasks/[id]/edit/page.tsx

User dapat mengubah data task yang sudah ada.

### 9.4 Halaman Team

Halaman team tersedia di:

- app/team/page.tsx

Fitur terkait team dapat dipakai untuk mengelola anggota tim dan relasi tim.

### 9.5 Halaman Team Task

Halaman ini tersedia di:

- app/team-task/page.tsx

Digunakan untuk melihat task yang berkaitan dengan tim tertentu.

### 9.6 Halaman User Management

Halaman ini tersedia di:

- app/user-management/page.tsx

Biasanya dipakai untuk mengelola akun dan data pengguna.

### 9.7 Halaman Resources

Halaman resources tersedia di:

- app/resources/page.tsx

Halaman ini terkait manajemen resource dan pemetaan permission.

---

## 10. Role dan Permission

Akses UI di frontend dibatasi berdasarkan role user.

Permission logic ada di:

- lib/permissions.ts

Role yang umum dipakai:

- admin
- lead
- employee

Contoh pengecekan izin:

```ts
import { hasPermission } from "@/lib/permissions";

const canCreateTask = hasPermission(user?.role, "tasks.create");
```

Jika user tidak punya izin, frontend akan menampilkan pesan akses ditolak.

---

## 11. State Management Frontend

Frontend memakai pendekatan sederhana dengan React Context dan custom hooks:

### 11.1 Context

- AuthContext : menyimpan status login/token
- UserContext : menyimpan data user aktif
- SidebarContext : menyimpan status sidebar

### 11.2 Hooks

- useTasks : mengambil dan mengelola data task
- useTeams : mengambil dan mengelola data team
- useUsers : mengambil dan mengelola data user

### 11.3 Local storage

Frontend memakai localStorage untuk menyimpan:

- token
- data user
- data fallback lokal untuk beberapa fitur

---

## 12. Cara Kerja Fallback Data Lokal

Jika backend tidak tersedia atau request gagal, frontend tidak langsung mati. Aplikasi akan mencoba memakai data lokal dari:

- lib/mockData.ts

Hal ini membantu UI tetap bisa berjalan untuk kebutuhan demo atau saat backend belum siap.

Contoh pola:

```ts
try {
  const { data } = await api.get("/api/v1/users");
  setUsers(data);
} catch {
  const fallback = getStoredUsers();
  setUsers(fallback);
}
```

---

## 13. Tips Saat Menggunakan Frontend

### 13.1 Pastikan backend sudah berjalan

Frontend memerlukan backend aktif di port 8000 atau URL yang diatur di NEXT_PUBLIC_API_URL.

### 13.2 Periksa token login

Jika halaman otomatis redirect ke login, kemungkinan:

- token tidak ada
- token sudah expired
- backend gagal mengembalikan token

### 13.3 Periksa response dari browser devtools

Untuk debugging, gunakan:

- Network tab di browser
- Console tab

Lihat request yang dikirim dan response yang diterima.

### 13.4 Periksa console saat error

Error frontend biasanya muncul karena:

- endpoint backend tidak tersedia
- request dikirim ke path yang salah
- token tidak terkirim
- backend mengembalikan status 401/403/404/500

---

## 14. Contoh Skenario Penggunaan

### Skenario 1: Login dan lihat task

1. Buka halaman login
2. Masukkan kredensial
3. Setelah login, masuk ke halaman task
4. Lihat daftar task yang tersedia

### Skenario 2: Tambah task baru

1. Buka halaman task
2. Klik tombol tambah task
3. Isi form
4. Klik simpan
5. Aplikasi akan mengirim request ke backend dan kembali ke daftar task

### Skenario 3: Edit task

1. Klik tombol edit pada task tertentu
2. Ubah field yang diperlukan
3. Klik tombol perbarui
4. Data akan dikirim ke backend lalu halaman kembali ke daftar task

### Skenario 4: Ubah status task

1. Di tabel task, ubah status lewat dropdown
2. Frontend akan memanggil endpoint patch status
3. UI akan diperbarui sesuai response backend

---

## 15. Endpoint Backend yang Sering Dipakai dari Frontend

Berikut beberapa endpoint yang paling sering dipakai:

- POST /api/v1/auth/login
- POST /api/v1/auth/register
- GET /api/v1/tasks
- POST /api/v1/tasks
- GET /api/v1/tasks/:id
- PUT /api/v1/tasks/:id
- PATCH /api/v1/tasks/:id/status
- DELETE /api/v1/tasks/:id
- GET /api/v1/users
- GET /api/v1/teams

---

## 16. Ringkasan Singkat

Frontend Task Management bekerja dengan pola berikut:

1. User login melalui halaman login
2. Token disimpan dan dipakai untuk request berikutnya
3. Request dikirim ke backend melalui axios dan proxy route
4. Respons backend dibaca dan ditampilkan di UI
5. Jika error terjadi, frontend menampilkan pesan yang sesuai

Dengan memahami alur ini, developer bisa lebih mudah mengembangkan fitur baru maupun melakukan debugging saat terjadi masalah.
