-- 1. Tạo bảng profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  email text not null
);

-- 2. Bật Row Level Security (Bảo mật)
alter table public.profiles enable row level security;

-- 3. Tạo chính sách: Cho phép mọi người đọc thông tin username để hệ thống có thể đối chiếu email khi đăng nhập
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

-- 4. Tạo chính sách: Cho phép user vừa đăng ký có thể tự insert thông tin của mình vào
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

-- 5. Cho phép user tự sửa thông tin (nếu cần đổi tên sau này)
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);
