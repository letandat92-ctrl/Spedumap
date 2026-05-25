# SPEDUMAP — Vercel Deployment Guide

## Lần đầu deploy

### Bước 1 — Install Vercel CLI
```bash
npm install -g vercel
```

### Bước 2 — Login Vercel
```bash
vercel login
```

### Bước 3 — Deploy
```bash
cd ~/Downloads/spedumap-app
vercel --prod
```

Vercel sẽ hỏi:
- Set up and deploy? → **Y**
- Which scope? → chọn account của bạn
- Link to existing project? → **N** (lần đầu)
- Project name? → **spedumap**
- Directory? → **./** (Enter)

### Bước 4 — Set Environment Variables
Sau khi deploy lần đầu, vào Vercel Dashboard → Project → Settings → Environment Variables, thêm:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sfwmcdezjlkedyjjgkng.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_vp7-C3CtbV8v1MSbiodgiA_hB0c42Gb` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(lấy từ Supabase Dashboard → Settings → API → service_role)* |
| `NEXT_PUBLIC_APP_URL` | *(URL Vercel cấp, dạng https://spedumap-xxx.vercel.app)* |

### Bước 5 — Redeploy sau khi set env vars
```bash
vercel --prod
```

## Deploy lần tiếp theo (sau khi sửa code)
```bash
cd ~/Downloads/spedumap-app
vercel --prod
```

## Custom domain (tuỳ chọn)
Vercel Dashboard → Project → Settings → Domains → Add domain → nhập domain của bạn.

## Kiểm tra sau deploy
1. Mở URL Vercel → login → redirect về `/therapist/baseline`
2. Nhập điểm → Khóa Baseline → Goal Setting → Mở Cycle → Session → Report
3. Admin panel: tạo user mới với temp password

## Lưu ý quan trọng
- `.env.local` **KHÔNG** được commit lên git — đã có trong `.gitignore`
- `SUPABASE_SERVICE_ROLE_KEY` chỉ set trên Vercel server-side, không bao giờ expose client
- Vercel free tier: unlimited deployments, 100GB bandwidth/month
