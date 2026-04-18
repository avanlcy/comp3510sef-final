# comp3510sef-final

A full-stack shopping web application built as a school project.

## Project Members
| Name | Student ID |
|------|-----------|
| Fu Hoi | 12728551 |
| Lau Chun Kit | 13897100 |
| Chong Tse Ho | 13990354 |
| Lee Chun Yin | 14007429 |
| Phang Chi Ho | 14100612 |
| Fung Ming Chu | 14201890 |
| Fung Long Hei | 14219499 |

## Stack

- **Frontend:** HTML / CSS / JavaScript
- **Backend:** JavaScript (Node.js) + Express + JWT
- **Data storage:** PostgreSQL + MinIO (S3-compatible object storage)
- **Infrastructure:** Docker + Docker Compose + nginx

## Getting Started

Install Docker on a Debian-based distro:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
./get-docker.sh
```

Clone this repository:
```bash
git clone https://github.com/avanlcy/comp3510sef-final
```

Run the stack:
```bash
cd comp3510sef-final
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:3000/api |
| MinIO console | http://localhost:9001 |
| PostgreSQL | localhost:5433 |