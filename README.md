# Emergency Triage System

A modern web application for managing emergency triage processes in healthcare facilities.

## Features

- Patient registration and management
- Triage assessment and prioritization
- Real-time patient tracking
- Secure data storage and access
- Role-based access control

## Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- PostgreSQL (managed by Docker in production)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd EmergencyTriage
```

2. Create a `.env` file in the root directory with the following variables:
```
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=emergency_triage
DATABASE_URL=postgresql://your_db_user:your_db_password@db:5432/emergency_triage
NODE_ENV=production
PORT=3000
```

3. Start the application using Docker Compose:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

## Development

For local development:

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Run database migrations:
```bash
npm run migrate
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm test` - Run tests
- `npm run lint` - Run linter

## Project Structure

```
EmergencyTriage/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── scripts/               # Utility scripts
└── tests/                 # Test files
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.