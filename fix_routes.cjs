const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const routes = `
const ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  ONBOARDING: '/onboarding',
  STUDENT_DASHBOARD: '/student/dashboard',
  VERIFY_BASE: '/verify'
};`;

code = code.replace(/import QRCode from 'qrcode';/g, `import QRCode from 'qrcode';\n\n${routes}`);

// Replacements
code = code.replace(/window\.location\.href = '\/onboarding'/g, "window.location.href = ROUTES.ONBOARDING");
code = code.replace(/window\.location\.href = '\/admin'/g, "window.location.href = ROUTES.ADMIN");
code = code.replace(/window\.location\.href = '\/student-dashboard'/g, "window.location.href = ROUTES.STUDENT_DASHBOARD");
code = code.replace(/window\.location\.href = '\/'/g, "window.location.href = ROUTES.HOME");
code = code.replace(/<a href="\/verify-cert"/g, '<a href={ROUTES.VERIFY_BASE}');

// Update router
const routerRegex = /export default function App\(\) \{[\s\S]*?\}/;
const newRouter = `export default function App() {
  const path = window.location.pathname;

  if (path.startsWith(ROUTES.VERIFY_BASE + '/')) {
    const certId = path.split('/')[2];
    if (certId) {
      return <VerifyCertPage urlCertId={certId} />;
    }
  }

  if (path === ROUTES.VERIFY_BASE) {
    return <VerifyCertPage />;
  }
  
  if (path === ROUTES.ADMIN) {
    return <AdminDashboardPage />;
  }

  if (path === ROUTES.ONBOARDING) {
    return <OnboardingPage />;
  }
  
  if (path === ROUTES.STUDENT_DASHBOARD) {
    return <StudentDashboardPage />;
  }

  return <LandingPage />;
}`;

code = code.replace(routerRegex, newRouter);

fs.writeFileSync('src/App.jsx', code);
console.log('Routes centralized successfully');
