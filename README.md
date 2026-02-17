# Registry App

Registry App — Веб-приложение для учета участников мероприятий и соревнований

## Стек технологий

**Backend:**
- Node.js
- PostgreSQL

**Frontend:**
- React
  

## Установка проекта

### 1. Клонирование репозитория

bash
git clone https://github.com/Zalatarnik/Registry.git
cd Registry

## Настройка Backend

### 2. Создать файл `.env` в папке `backend/`

Создайте файл:

backend/.env

Пример содержимого:

DB_NAME=registry_app
DB_USER=postgres
DB_PASSWORD=postgre
DB_HOST=localhost
DB_PORT=5432

JWT_SECRET=any_super_secret_key
PORT=8000

### 3. Установка зависимостей и запуск сервера

bash
cd backend
npm install
node server.js

Сервер будет доступен по адресу:

http://localhost:8000

## Запуск Frontend

В отдельном терминале:

bash
cd frontend
npm install
npm start

Приложение откроется по адресу:

http://localhost:3000

## Возможности

* Регистрация и авторизация пользователей
* Создание и управление мероприятиями кураторами
* Возможность записаться на мероприятия студенту
* Хранение информации об участии в мероприятиях(в том числе сертификатов, грамот и т.д.)
* Отправка приглашений студентам на участие в мероприятиях
* Общение куратора и студента на платформе
* Экспорт данных в таблицы Excel
* Работа с реестром данных


## Авторы

Zalatarnik, fastam
