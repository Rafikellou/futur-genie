# Deployment Guide for Futur Génie Educational Platform

## Overview
This guide provides comprehensive instructions for deploying the Futur Génie educational platform to production environments.

## Prerequisites

### Required Services
1. **Supabase Project** - Database and Authentication
2. **OpenAI Account** - AI quiz generation
3. **Vercel Account** (recommended) or other hosting platform
4. **Domain Name** (optional but recommended)

### Required Tools
- Node.js 18+ 
- npm/yarn/pnpm
- Git

## Environment Setup

### 1. Supabase Configuration

1. Create a new Supabase project at https://supabase.com
2. Execute SQL files in order:
   - `sql/schema.sql` - Database schema
   - `sql/rls-policies.sql` - Security policies  
   - `sql/seed-data.sql` - Sample data
3. Get your project credentials:
   - Project URL
   - Anon (public) key
   - Service role key

### 2. OpenAI Configuration

1. Create an OpenAI account at https://openai.com
2. Generate an API key from the dashboard
3. Ensure you have sufficient credits for API usage

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Critical Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-your_openai_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Deployment Options

### Option 1: Vercel (Recommended)

#### Quick Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/futur-genie)

#### Manual Deploy
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Configure environment variables in Vercel dashboard

#### Vercel Configuration
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

### Option 2: Netlify

1. Build the project:
```bash
npm run build
npm run export
```

2. Deploy the `out` folder to Netlify

3. Configure environment variables in Netlify dashboard

### Option 3: Self-Hosted

#### Using Docker

1. Create Dockerfile:
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["npm", "start"]
```

2. Build and run:
```bash
docker build -t futur-genie .
docker run -p 3000:3000 futur-genie
```

#### Using PM2

1. Install PM2:
```bash
npm install -g pm2
```

2. Create ecosystem file:
```javascript
module.exports = {
  apps: [{
    name: 'futur-genie',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/futur-genie',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

3. Deploy:
```bash
npm run build
pm2 start ecosystem.config.js
```

## Database Migration

### Initial Setup
1. Execute SQL files in Supabase dashboard:
   - Go to SQL Editor
   - Run `schema.sql` first
   - Run `rls-policies.sql` second  
   - Run `seed-data.sql` last

### Future Migrations
- Create new SQL files for schema changes
- Test in staging environment first
- Apply to production during maintenance windows

## Performance Optimization

### Next.js Configuration
- Enable image optimization
- Configure caching headers
- Use ISR (Incremental Static Regeneration) where appropriate

### Database Optimization
- Index frequently queried fields
- Use Supabase connection pooling
- Monitor query performance

### CDN Setup
- Configure CDN for static assets
- Enable gzip compression
- Optimize images with next/image

## Security Checklist

### Environment Security
- [ ] All environment variables use production values
- [ ] No development keys in production
- [ ] HTTPS enabled for all domains
- [ ] Secure headers configured

### Database Security
- [ ] RLS policies enabled and tested
- [ ] Service role key secured
- [ ] Regular security audits
- [ ] Backup strategy implemented

### Application Security
- [ ] Authentication flows tested
- [ ] Role-based access verified
- [ ] Input validation in place
- [ ] CSRF protection enabled

## Monitoring and Maintenance

### Error Tracking
- Set up Sentry or similar error tracking
- Configure alerts for critical errors
- Monitor API usage and limits

### Performance Monitoring
- Use Vercel Analytics or Google Analytics
- Monitor Core Web Vitals
- Track user engagement metrics

### Backup Strategy
- Supabase automatic backups
- Regular database exports
- Code repository backups

## Domain and SSL

### Custom Domain Setup
1. Add domain in hosting platform dashboard
2. Configure DNS records:
   - A record: @ -> hosting platform IP
   - CNAME: www -> hosting platform domain
3. Enable SSL certificate (automatic with most platforms)

### Environment URLs
- **Production**: https://your-domain.com
- **Staging**: https://staging.your-domain.com
- **Development**: http://localhost:3000

## Post-Deployment Steps

1. **Test All Features**
   - User registration and login
   - Dashboard functionality
   - Quiz creation and taking
   - Real-time statistics
   - Role-based access

2. **Performance Testing**
   - Load testing with realistic user scenarios
   - Database query optimization
   - Image and asset optimization

3. **Security Testing**
   - Penetration testing
   - Authentication flow validation
   - Data privacy compliance

4. **User Acceptance Testing**
   - Test with real educators
   - Gather feedback and iterate
   - Documentation for end users

## Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version compatibility
- Verify all dependencies installed
- Review build logs for specific errors

**Database Connection**
- Verify Supabase credentials
- Check network connectivity
- Validate RLS policies

**Authentication Issues**
- Confirm Supabase auth configuration
- Check redirect URLs
- Verify environment variables

**Performance Issues**
- Monitor database query performance
- Check for memory leaks
- Optimize large data fetching

## Support and Maintenance

### Regular Tasks
- Weekly: Monitor error logs and performance
- Monthly: Review security updates
- Quarterly: Performance optimization review
- Annually: Security audit and penetration testing

### Scaling Considerations
- Database connection limits
- API rate limiting
- CDN configuration
- Load balancing for high traffic

## Contact Information

For deployment support:
- Documentation: [Project Wiki]
- Issues: [GitHub Issues]
- Support: [Support Email]

---

**Last Updated**: January 2025
**Version**: 1.0
**Platform**: Next.js 15.5.0 with Supabase