import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Briefcase, ShieldCheck, Database, Layout, Code, PenTool, CheckCircle, Clock, MapPin, Shield, Cpu } from 'lucide-react';
import { supabase } from './supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';


const ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  ONBOARDING: '/onboarding',
  STUDENT_DASHBOARD: '/student/dashboard',
  VERIFY_BASE: '/verify'
};

const DOMAIN_MAP = {
  'fsd': 'Full Stack Development',
  'vlsi': 'Embedded System Development',
  'cpp': 'C++ Programming',
  'cyber': 'Cyber Security',
  'da': 'Data Analytics',
  'ds': 'Data Science',
  'uiux': 'UI/UX Designing',
  'web': 'Web Development'
};

const generateCertificate = async (name, college, domain, certId, studentId) => {
  try {
    const existingPdfBytes = await fetch('/cert-bg-empty.pdf').then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();
    
    // Embed fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    
    // Colors
    const primaryColor = rgb(0.05, 0.27, 0.63);
    const textColor = rgb(0.12, 0.28, 0.49);
    
    // Draw Logos
    try {
      const thiranixLogoBytes = await fetch('/thiranix-logo.png').then(res => res.arrayBuffer());
      const thiranixLogo = await pdfDoc.embedPng(thiranixLogoBytes);
      const tDims = thiranixLogo.scaleToFit(200, 80);
      page.drawImage(thiranixLogo, {
        x: (width - tDims.width) / 2,
        y: height - 120,
        width: tDims.width,
        height: tDims.height,
      });
    } catch (e) { console.warn("Thiranix logo skip", e); }
    
    try {
      const aicteLogoBytes = await fetch('/aicte-logo.png').then(res => res.arrayBuffer());
      const aicteLogo = await pdfDoc.embedPng(aicteLogoBytes);
      const aDims = aicteLogo.scaleToFit(90, 80);
      page.drawImage(aicteLogo, {
        x: width - aDims.width - 40,
        y: height - 120,
        width: aDims.width,
        height: aDims.height,
      });
    } catch (e) { console.warn("AICTE logo skip", e); }

    const drawCenterText = (text, y, font, size, color) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
      return textWidth;
    };

    drawCenterText("CERTIFICATE", height - 230, timesRoman, 56, primaryColor);
    drawCenterText("OF INTERNSHIP", height - 285, timesRoman, 30, primaryColor);
    
    drawCenterText("This is to certify that", height - 350, helveticaBold, 14, textColor);
    
    const nameWidth = drawCenterText(name, height - 405, helveticaBold, 34, primaryColor);
    
    page.drawLine({
      start: { x: (width - nameWidth - 40) / 2, y: height - 420 },
      end: { x: (width + nameWidth + 40) / 2, y: height - 420 },
      thickness: 1.5,
      color: primaryColor,
    });
    
    drawCenterText(college, height - 460, helveticaBold, 20, primaryColor);
    
    drawCenterText("has successfully completed 8-weeks", height - 505, helvetica, 16, textColor);
    
    const fullDomain = DOMAIN_MAP[domain] || domain;
    drawCenterText(fullDomain + " Virtual Internship", height - 545, helveticaBold, 20, primaryColor);
    
    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    drawCenterText(`Issued on: ${issueDate}`, height - 580, helvetica, 16, textColor);

    // QR Code
    const verifyUrl = `${window.location.origin}${ROUTES.VERIFY_BASE}/${certId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });
    const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    
    page.drawImage(qrImage, {
      x: 50,
      y: 90,
      width: 70,
      height: 70,
    });
    
    page.drawText(`Certificate ID: ${certId}`, { x: 50, y: 70, size: 10, font: helvetica, color: textColor });
    page.drawText(`Student ID: ${studentId}`, { x: 50, y: 55, size: 10, font: helvetica, color: textColor });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${certId}.pdf`;
    link.click();
  } catch (err) {
    console.error("Failed to generate certificate", err);
    alert("Payment successful, but failed to automatically download certificate. Please contact support.");
  }
};

function Header({ onOpenRegister, onOpenLogin }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.email);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (email) => {
    try {
      const { data } = await supabase.from('registrations').select('full_name').ilike('email', email).single();
      if (data) setUserProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = ROUTES.HOME;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 py-3 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <a href="/" className="flex items-center">
          <img src="/thiranix_logo.png" alt="Thiranix Logo" className="h-16 w-auto" />
        </a>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
        <a href="/" className="hover:text-blue-600 transition-colors">About</a>
        <a href="/" className="hover:text-blue-600 transition-colors">Domains</a>
        <a href={ROUTES.VERIFY_BASE} className="hover:text-blue-600 transition-colors font-semibold">Verify Cert</a>
        {session && (
          <a href={ROUTES.STUDENT_DASHBOARD} className="hover:text-blue-600 transition-colors font-semibold text-blue-600">Dashboard</a>
        )}
      </nav>
      <div className="flex items-center gap-4">
        {session ? (
          <>
            <span className="text-slate-600 font-semibold text-sm hidden md:block">👤 {userProfile?.full_name || 'Student'}</span>
            <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2 rounded-md font-medium transition-colors shadow-sm text-sm border border-red-100">
              Logout
            </button>
          </>
        ) : (
          <>
            <button onClick={onOpenRegister} className="text-blue-600 font-semibold text-sm hover:underline hidden md:block">Register</button>
            <button onClick={onOpenLogin} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors shadow-sm">
              Login
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function NotificationBanner({ onOpenRegister }) {
  const content = (
    <div className="flex items-center gap-8 shrink-0 pr-8">
      <div className="flex items-center gap-2 font-bold tracking-wide">
          <span className="text-yellow-400">NEW BATCH STARTED TODAY — 12th June 2026 | Enroll Soon</span>
          <span className="bg-yellow-400 text-red-700 px-3 py-1 rounded-full text-xs">Register Now — THX-JUN26-002</span>
      </div>
      <div className="flex items-center gap-4 font-medium">
          <span>📅 Next Batch Selection Ends Soon! Enroll Now to Secure Your Domain.</span>
          <button onClick={onOpenRegister} className="bg-yellow-400 text-red-700 px-4 py-1 rounded-full text-xs font-bold hover:bg-yellow-300 transition-colors">
              Apply Before Selection Closes
          </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#b91c1c] text-white py-2 overflow-hidden flex relative w-full group">
        <div className="flex animate-[marquee_20s_linear_infinite] group-hover:[animation-play-state:paused] min-w-max">
            {content}
            {content}
            {content}
            {content}
        </div>
    </div>
  );
}

function Hero({ onOpenRegister }) {
  return (
    <section className="relative bg-[#1e3a8a] text-white pt-20 pb-40 px-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-blue-800/50 border border-blue-700 px-4 py-1.5 rounded-full text-xs font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            JOIN 50,000+ VIRTUAL INTERNS ACROSS INDIA
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          <span className="text-yellow-400 drop-shadow-md">8-Week Virtual Technical Internship</span> 2026 | Pan-India
        </h1>
        
        <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-3xl mx-auto font-medium">
          Apply, learn, and complete your internship. Choose from 15+ domains, get an instant offer letter, and build real project experience online with THIRANIX.
        </p>

        <div className="inline-flex items-center gap-2 bg-blue-900/60 border border-blue-700/50 px-5 py-2 rounded-full text-sm font-medium mb-8">
            <Clock size={16} className="text-yellow-400" />
            <span>New Batch Started Today: <strong>12th June 2026</strong> | Enroll Soon!</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onOpenRegister} className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold py-3.5 px-8 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all hover:scale-105 w-full sm:w-auto">
            Get Started Now
          </button>
          <button 
            onClick={() => document.getElementById('domains')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-transparent border border-blue-400 hover:bg-blue-800/50 text-white font-semibold py-3.5 px-8 rounded-full transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            Explore Domains <span>→</span>
          </button>
        </div>

        <p className="text-xs text-blue-200 mt-6 font-medium italic opacity-80">
          * For processing a certificate we may charge a minimal administrative fee
        </p>

        <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-xs font-medium text-blue-200">
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} /> Verified Program</div>
            <div className="flex items-center gap-1.5"><CheckCircle size={14} /> Instant Offer Letter</div>
            <div className="flex items-center gap-1.5"><Code size={14} /> 100% Virtual</div>
        </div>
      </div>
    </section>
  );
}

function StatsCards() {
  return (
    <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-20 mb-20">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition duration-500 hover:-translate-y-2 border border-gray-100">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Platform Live
          </div>
          <h3 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            1,049,668
          </h3>
          <p className="font-bold text-gray-800 tracking-widest text-sm mb-4">ACTIVE INTERNS</p>
          <p className="text-gray-500 text-sm">Students learning and building projects daily across 15+ domains.</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition duration-500 hover:-translate-y-2 border border-gray-100">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-wider">
             <Shield size={14} /> Secure Verification
          </div>
          <h3 className="text-5xl md:text-6xl font-extrabold text-emerald-500 mb-2">
            725,601
          </h3>
          <p className="font-bold text-gray-800 tracking-widest text-sm mb-4">CERTIFICATES ISSUED</p>
          <p className="text-gray-500 text-sm">Verified credentials recognized by recruiters and top institutions.</p>
        </div>
      </div>
    </div>
  );
}

function InternshipTracks() {
  const tracks = [
    { title: "Full Stack Development", icon: <Layout className="text-orange-500" />, border: "border-t-orange-400" },
    { title: "Embedded System Development", icon: <Cpu className="text-purple-500" />, border: "border-t-purple-400" },
    { title: "C++ Programming", icon: <Code className="text-pink-500" />, border: "border-t-pink-400" },
    { title: "Cyber Security", icon: <ShieldCheck className="text-green-500" />, border: "border-t-green-400" },
    { title: "Data Analytics", icon: <Database className="text-cyan-500" />, border: "border-t-cyan-400" },
    { title: "Data Science", icon: <Database className="text-blue-500" />, border: "border-t-blue-400" },
    { title: "UI/UX Designing", icon: <Layout className="text-blue-400" />, border: "border-t-blue-300" },
    { title: "Web Development", icon: <Code className="text-slate-800" />, border: "border-t-slate-800" },
  ];

  return (
    <section id="domains" className="py-16 px-6 max-w-7xl mx-auto bg-gray-50">
      <div className="text-center mb-12">
        <p className="text-blue-600 font-bold tracking-widest text-xs mb-2 uppercase">Internship Tracks</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">Choose Your Career Path</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">Select from our industry-vetted internship programs designed to make you job-ready.</p>
      </div>
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tracks.map((track, i) => (
          <div key={i} className={`bg-white rounded-xl shadow-sm hover:shadow-xl p-6 border-t-4 ${track.border} transition-all duration-300 cursor-pointer group`}>
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {track.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{track.title}</h3>
            <p className="text-sm text-gray-500 mb-4">4 curated modules focused on industry-standard workflows.</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "Is the Thiranex internship verified?", a: "Yes, our internships are 100% verified and recognized." },
    { q: "Is Thiranex internship recognized by companies and colleges?", a: "Our certificates are recognized by top institutions and recruiters across India." },
    { q: "Can I do this internship along with my college studies?", a: "Yes, the program is fully virtual and flexible to accommodate your college schedule." },
    { q: "What is the selection criteria for the 2026 batch?", a: "Selection is based on early application and basic skill assessment." },
    { q: "How soon will I receive my Offer Letter?", a: "Offer letters are generated instantly upon successful registration." },
  ];

  const [open, setOpen] = useState(null);

  return (
    <section className="py-20 px-6 max-w-3xl mx-auto">
      <h2 className="text-center text-2xl font-bold text-slate-800 mb-10 hidden">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white border border-gray-100 shadow-sm rounded-lg overflow-hidden">
            <button 
              className="w-full text-left px-6 py-5 font-bold text-slate-700 flex justify-between items-center focus:outline-none"
              onClick={() => setOpen(open === i ? null : i)}
            >
              {faq.q}
              <span className="text-blue-500 font-normal">
                {open === i ? '-' : '+'}
              </span>
            </button>
            {open === i && (
              <div className="px-6 pb-5 text-gray-600 text-sm">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer({ onOpenPolicy }) {
  return (
    <footer className="bg-[#0f172a] text-gray-300 py-16 px-6 border-t-4 border-red-600">
      <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10">
        <div className="col-span-1 md:col-span-1">
          <div className="mb-6">
            <img src="/thiranix_logo.png" alt="Thiranix Logo" className="h-10 w-auto brightness-0 invert" />
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Our mission is to <strong className="text-white">create innovative e-learning solutions</strong> that empower students to <strong className="text-white">achieve their full potential</strong> through real-world virtual projects. #1 MSME Registered Learning Hub.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6">Popular Domains</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li><a href="#" className="hover:text-blue-400">Python Development Internship</a></li>
            <li><a href="#" className="hover:text-blue-400">Online Data Science Virtual Internship</a></li>
            <li><a href="#" className="hover:text-blue-400">Python Internship with Certificate</a></li>
            <li><a href="#" className="hover:text-blue-400">AI & Machine Learning Virtual Internship</a></li>
            <li><a href="#" className="hover:text-blue-400">Cyber Security Online Internship</a></li>
            <li><a href="#" className="hover:text-blue-400">UI/UX Design Internship for Beginners</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6">Top Internship Cities</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li><a href="#" className="hover:text-blue-400">Online Internships in Bangalore</a></li>
            <li><a href="#" className="hover:text-blue-400">Virtual Internships in Chennai</a></li>
            <li><a href="#" className="hover:text-blue-400">Internships for Students in Hyderabad</a></li>
            <li><a href="#" className="hover:text-blue-400">Internships in Pune & Mumbai</a></li>
            <li><a href="#" className="hover:text-blue-400">Work from Home Internships Delhi NCR</a></li>
            <li><a href="#" className="hover:text-blue-400">Internships for B.Tech Students Across</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li><button onClick={onOpenPolicy} className="hover:text-blue-400">Terms & Conditions</button></li>
            <li><button onClick={onOpenPolicy} className="hover:text-blue-400">Privacy Policy</button></li>
            <li><a href="mailto:thiranix.internships@gmail.com" className="hover:text-blue-400">thiranix.internships@gmail.com</a></li>
            <li>Bengaluru, Karnataka, India.</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 text-xs text-center text-gray-500">
        System developed and maintained by Team Emogi.
      </div>
    </footer>
  );
}

function ToastNotification() {
  const [toast, setToast] = useState({ name: 'Deepika G.', city: 'Bangalore', domain: 'App Development' });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const data = [
      { name: 'Ankit V.', city: 'Pune', domain: 'Cyber Security' },
      { name: 'Deepika G.', city: 'Bangalore', domain: 'App Development' },
      { name: 'Rahul S.', city: 'Chennai', domain: 'Full Stack' }
    ];
    let i = 0;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        i = (i + 1) % data.length;
        setToast(data[i]);
        setVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed bottom-6 left-6 bg-white rounded-lg shadow-2xl p-3 flex items-center gap-3 border border-gray-100 z-40 transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0">
        <CheckCircle size={16} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{toast.name} from {toast.city}</p>
        <p className="text-xs text-gray-500">Just applied for <span className="text-blue-600 font-semibold">{toast.domain}</span></p>
      </div>
    </div>
  );
}

function PopupModal({ onClose, onOpenRegister }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative animate-[fade-in_0.3s_ease-out]">
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-4">Ready to jumpstart your career?</h2>
        <p className="text-gray-600 mb-8">
          Join 50,000+ students and get your <strong className="text-slate-800">8-Week Virtual Technical Internship</strong> and instant offer letter today!
        </p>
        <button onClick={onOpenRegister} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-4 shadow-md shadow-blue-500/30">
          Register Now
        </button>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 underline transition-colors font-medium">
          Maybe later
        </button>
      </div>
    </div>
  );
}
function RegisterModal({ onClose, onOpenPolicy }) {
  const [formData, setFormData] = useState({
    full_name: '', email: '', mobile: '', dob: '', domain: '', password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw authError;
      }

      const { data, error } = await supabase.from('registrations').insert([
        {
          full_name: formData.full_name,
          email: formData.email,
          mobile_number: formData.mobile,
          date_of_birth: formData.dob,
          domain: formData.domain,
          password: formData.password, // Keeping for schema compatibility
          payment_status: 'pending'
        }
      ]).select().single();

      if (error) {
        console.error('Error inserting registration:', error);
        if (error.code === '23505') {
          alert("Registration Failed! This email or mobile number is already registered. Please log in instead.");
        } else {
          alert("Registration Failed! Error: " + error.message);
        }
        setLoading(false);
        return;
      }
      
      localStorage.setItem('registeredEmail', formData.email);
      localStorage.setItem('registeredName', formData.full_name);
      localStorage.setItem('registeredDomain', formData.domain);
      
      window.location.href = ROUTES.ONBOARDING;
    } catch (err) {
      console.error(err);
      alert("Registration Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full relative animate-[fade-in_0.3s_ease-out] my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">&times;</button>
        
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4 overflow-hidden border border-blue-100">
            <img src="/stamp.png" alt="Stamp" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">Internship Selection<br/>2026</h2>
          <p className="text-gray-500 text-sm mt-2">Apply for your 8-Week Virtual Technical Internship at Thiranix</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3 mb-6">
          <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5">!</div>
          <div>
            <p className="text-sm font-bold text-orange-800">Hurry! Batch Enrolling Now</p>
            <p className="text-xs text-orange-600">Only 5 slots left for your domain!</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Enter your full name" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="name@college.edu" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Create a password" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
            <input type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="10-digit mobile number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
            <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Domain</label>
            <select value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600" required>
              <option value="" disabled>Choose your track...</option>
              <option value="fsd">Full Stack Development</option>
              <option value="vlsi">Embedded System Development</option>
              <option value="cpp">C++ Programming</option>
              <option value="cyber">Cyber Security</option>
              <option value="da">Data Analytics</option>
              <option value="ds">Data Science</option>
              <option value="uiux">UI/UX Designing</option>
              <option value="web">Web Development</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all hover:scale-[1.02] mt-2 disabled:opacity-70">
            {loading ? 'Processing...' : 'Submit Registration \u2192'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          By clicking submit, you agree to our <button onClick={onOpenPolicy} className="text-blue-600 font-semibold hover:underline">Terms and Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}

function PolicyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative my-auto animate-[fade-in_0.3s_ease-out]">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-800">Legal Policies</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors text-2xl leading-none">&times;</button>
        </div>
        <div className="p-8 text-sm text-gray-600 space-y-8">
          {/* Privacy Policy */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Privacy Policy</h3>
            <p className="font-semibold text-slate-700 mb-4">Official Policy | Updated: March 25, 2026</p>
            <p className="mb-4">This page explains your rights, payments, and responsibilities clearly to ensure transparency and trust. We believe in transparent policies and fair usage.</p>
            
            <h4 className="font-bold text-slate-800 mt-6 mb-2">Information Collected</h4>
            <p className="mb-2">We collect the following information to provide and improve our services:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Name, email, and phone number for account creation and communication.</li>
              <li>Payment details processed securely through our payment partners.</li>
              <li>Internship activity including task submissions and performance data.</li>
              <li>Website usage analytics to understand how users interact with our platform.</li>
            </ul>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">How Data Is Used</h4>
            <p className="mb-2">Your data is used for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Service delivery including internship management and training.</li>
              <li>Communication and support to assist you with any queries.</li>
              <li>Certificates and invoices generation upon completion.</li>
              <li>Platform improvement based on user feedback and usage patterns.</li>
              <li>Optional marketing updates about new opportunities (you can opt-out anytime).</li>
            </ul>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Data Protection</h4>
            <p className="mb-4">THIRANIX uses industry-standard security practices and restricted access protocols to protect your personal data from unauthorized access, alteration, or disclosure. We implement SSL encryption and regular security audits to ensure data integrity.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Data Sharing</h4>
            <p className="mb-4">Your data is never sold to third parties. It may be shared only with trusted service providers like payment gateways or hosting partners strictly for the purpose of service delivery and operational efficiency.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">User Rights</h4>
            <p className="mb-4">You have the right to request correction, deletion, or access to your personal data. You may also opt-out of any marketing communications at any time by contacting our support team.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Data Retention</h4>
            <p className="mb-4">Data is stored only as long as needed for the fulfillment of our services and to comply with legal and regulatory requirements. Completed internship records are kept for verification purposes.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Children's Privacy</h4>
            <p className="mb-4">Our services are intended for users above 13 years of age. We do not knowingly collect data from children under this age. If we discover such data, we take immediate steps to delete it.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Updates</h4>
            <p className="mb-4">This policy may change anytime to reflect changes in our data practices. Any updates will be posted on this page with a revised "Last Updated" date.</p>
          </section>

          <hr className="border-gray-200" />

          {/* Terms & Conditions */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Terms & Conditions</h3>
            <p className="font-semibold text-slate-700 mb-4">Official Policy | Updated: March 25, 2026</p>
            <p className="mb-4">This page explains your rights, payments, and responsibilities clearly to ensure transparency and trust. We believe in transparent policies and fair usage.</p>
            
            <h4 className="font-bold text-slate-800 mt-6 mb-2">Introduction</h4>
            <p className="mb-4">By using THIRANIX's website, internships, training programs, or services, you agree to these terms and conditions. These terms constitute a legally binding agreement between you and THIRANIX regarding your access to and use of our platform.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Services Offered</h4>
            <p className="mb-2">THIRANIX provides a wide range of digital and educational services:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Internships and training programs for students and professionals.</li>
              <li>Software and app development services for businesses.</li>
              <li>AI automation solutions and digital transformation.</li>
              <li>Digital products and tools for our members.</li>
            </ul>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Eligibility</h4>
            <p className="mb-4">Users must provide correct information and use the platform honestly. You are responsible for maintaining the confidentiality of any account details and for all activities that occur under your account.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">User Responsibilities</h4>
            <p className="mb-2">To maintain a fair and safe environment, users must:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Avoid plagiarism or cheating in any submitted tasks.</li>
              <li>Use all services legally and ethically.</li>
              <li>Not misuse or redistribute platform content.</li>
              <li>Not attempt hacking, copying, or reverse-engineering.</li>
            </ul>
            <p className="mb-4">Violation of these responsibilities may lead to immediate suspension or termination of services.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Internship Fees & Payments</h4>
            <p className="mb-2">Internship participation requires a small task submission fee to cover administrative costs, mentorship, and platform maintenance:</p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-md mb-4 inline-block">
              <p className="font-bold text-slate-800">8 Weeks Internship</p>
              <p className="text-xl text-blue-600 font-extrabold">₹199</p>
            </div>
            <p className="mb-4 italic">"These are task review charges, not hidden fees, and help maintain platform operations, servers, and mentorship support."</p>
            <p className="mb-4">These charges help support servers, mentors, and platform operations. They are charged only for managing and reviewing tasks. No personal profit or unnecessary fees are collected.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Refund Policy</h4>
            <p className="mb-4">All payments are non-refundable unless THIRANIX cancels the program itself. Please ensure you are committed to the program before making any payment. Refunds are issued only in the rare event that THIRANIX cancels the specific program you enrolled in.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Certificates & Deliverables</h4>
            <p className="mb-4">Certificates are issued only after successful completion of tasks and a positive performance evaluation by our mentors. Completion of the internship duration alone is not sufficient for certificate eligibility.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Intellectual Property</h4>
            <p className="mb-4">All content, code, branding, and materials belong to THIRANIX and cannot be copied, resold, or redistributed without explicit written permission. This includes but is not limited to project requirements, tutorial materials, and proprietary software.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Confidentiality</h4>
            <p className="mb-4">Any project data or client information shared with THIRANIX is treated with strict confidentiality and is protected by our internal security protocols. We do not share student data with third parties for marketing purposes.</p>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Limitation of Liability</h4>
            <p className="mb-2">THIRANIX is not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Internet or technical issues on the user's end.</li>
              <li>Data loss due to user mistakes or negligence.</li>
              <li>Third-party payment failures or delays.</li>
              <li>External tool downtime or API failures.</li>
            </ul>

            <h4 className="font-bold text-slate-800 mt-6 mb-2">Platform Maintenance & Service Provider</h4>
            <p className="mb-4">The THIRANIX website and platform infrastructure are developed and maintained by Emogi acting solely as a technical service provider. Emogi does not own, operate, or claim any responsibility for the business operations, content, internships, payments, or actions taken on this website. Any disputes, liabilities, or claims arising from the use of this website are strictly between the user and THIRANIX. Emogi's reputation, brand, and operations shall not be affected by or held liable for any activities occurring on the THIRANIX platform.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function LoginModal({ onClose, onOpenRegister, onOpenForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const ADMIN_EMAILS = ['aethermindtech@gmail.com', 'kakkirenivishwas@gmail.com'];
    if (ADMIN_EMAILS.includes(email) && password === 'Nani@1409') {
      localStorage.setItem('isAdmin', 'true');
      window.location.href = ROUTES.ADMIN;
      return;
    }
    
    try {
      const trimmedEmail = email.trim();
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (authError) {
        throw authError;
      }

      const ADMIN_EMAILS = ['aethermindtech@gmail.com', 'kakkirenivishwas@gmail.com'];
      if (ADMIN_EMAILS.includes(trimmedEmail)) {
        localStorage.setItem('isAdmin', 'true');
        window.location.href = ROUTES.ADMIN;
        return;
      }
      
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .ilike('email', trimmedEmail)
        .single();
        
      if (error || !data) {
        setError('Login successful, but profile not found.');
      } else {
        localStorage.setItem('registeredEmail', data.email);
        localStorage.setItem('registeredName', data.full_name);
        localStorage.setItem('registeredDomain', data.domain);
        
        if (data.payment_status === 'success') {
          window.location.href = ROUTES.STUDENT_DASHBOARD;
        } else {
          window.location.href = ROUTES.ONBOARDING;
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed due to network error.');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full relative animate-[fade-in_0.3s_ease-out] my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">&times;</button>
        
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4 overflow-hidden border border-blue-100">
            <img src="/stamp.png" alt="Stamp" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-2">Log in to your Thiranix portal</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100 font-medium">{error}</div>}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.edu" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600">Password</label>
                <button onClick={onOpenForgot} type="button" className="text-xs text-blue-600 font-medium hover:underline">Forgot Password?</button>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
          </div>
          
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all hover:scale-[1.02] mt-2">
            Log In &rarr;
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Don't have an account? <button onClick={() => { onClose(); onOpenRegister(); }} className="text-blue-600 font-semibold hover:underline">Register Here</button>
        </p>
      </div>
    </div>
  );
}

function ForgotPasswordModal({ onClose, onOpenLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full relative animate-[fade-in_0.3s_ease-out] my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">&times;</button>
        
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4 overflow-hidden border border-blue-100">
            <img src="/stamp.png" alt="Stamp" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">Reset Password</h2>
          <p className="text-gray-500 text-sm mt-2">Enter your email to receive a reset link</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100 font-medium">{error}</div>}
        
        {success ? (
          <div className="text-center">
            <div className="bg-green-50 text-green-600 text-sm p-4 rounded-lg mb-6 border border-green-100 font-bold flex flex-col items-center gap-2">
              <CheckCircle size={24} className="mx-auto" />
              Reset Link Sent! Check your email.
            </div>
            <button onClick={() => { onClose(); onOpenLogin(); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all hover:scale-[1.02]">
              Return to Login
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.edu" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all hover:scale-[1.02] mt-2 disabled:opacity-70 disabled:hover:scale-100">
              {loading ? 'Sending...' : 'Send Reset Link \u2192'}
            </button>
          </form>
        )}

        {!success && (
          <p className="text-center text-xs text-gray-500 mt-6">
            Remember your password? <button onClick={() => { onClose(); onOpenLogin(); }} className="text-blue-600 font-semibold hover:underline">Log In</button>
          </p>
        )}
      </div>
    </div>
  );
}

function VerifyCertPage({ urlCertId }) {
  const [certId, setCertId] = useState(urlCertId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedData, setVerifiedData] = useState(null);

  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    if (urlCertId) {
      validateCert(urlCertId);
    } else {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      if (idParam) {
        setCertId(idParam);
        validateCert(idParam);
      }
    }
  }, [urlCertId]);

  const validateCert = async (idToVerify) => {
    setLoading(true);
    setError('');
    setVerifiedData(null);
    console.log('--- CERTIFICATE VERIFICATION AUDIT ---');
    console.log('Certificate ID from URL:', idToVerify);
    console.log('Database query executed: SELECT * FROM registrations WHERE cert_id ilike', idToVerify);

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .ilike('cert_id', idToVerify);
        
      console.log('Rows returned:', data ? data.length : 0);
        
      if (error || !data || data.length === 0) {
        console.log('Verification result: FAILED');
        setError('INVALID CERTIFICATE');
      } else {
        console.log('Verification result: SUCCESS');
        setVerifiedData(data[0]);
      }
    } catch (err) {
      console.log('Verification result: ERROR', err);
      setError('Verification failed due to network error.');
    } finally {
      setLoading(false);
      console.log('--------------------------------------');
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (certId) validateCert(certId);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8fafc] text-slate-800 relative">
      <Header onOpenRegister={() => setShowRegister(true)} onOpenLogin={() => setShowLogin(true)} />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 mt-10 mb-20 animate-[fade-in_0.3s_ease-out]">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-8 md:p-12 max-w-xl w-full text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <ShieldCheck size={64} className="text-emerald-500" fill="#ecfdf5" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-800 mb-4">Verify Certificate</h1>
          <p className="text-gray-600 mb-8 text-lg">Enter the Certificate ID to validate authenticity and view the digital credential.</p>

          {!verifiedData && (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <input 
                type="text" 
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="E.G. Cert-xxx" 
                className="bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase text-center tracking-wider font-semibold" 
                required 
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-md transition-colors disabled:opacity-70 text-lg w-full"
              >
                {loading ? 'Verifying...' : 'Verify Credential'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-semibold text-xl">
              ❌ {error}
              <p className="text-sm text-red-600 mt-2 font-normal">Certificate does not exist.</p>
              <button onClick={() => {setError(''); setCertId('');}} className="block mt-4 mx-auto text-sm underline text-red-600 hover:text-red-800">Try Again</button>
            </div>
          )}

          {verifiedData && (
            <div className="mt-6 p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-left relative animate-[fade-in_0.5s_ease-out]">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-200">
                <CheckCircle className="text-emerald-500 w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                ✅ VERIFIED CERTIFICATE
              </h3>
              <div className="space-y-3 text-emerald-900">
                <p><strong>Student Name:</strong> {verifiedData.full_name}</p>
                <p><strong>College:</strong> {verifiedData.college_name}</p>
                <p><strong>Domain:</strong> {(DOMAIN_MAP[verifiedData.domain] || verifiedData.domain)} Virtual Technical Internship</p>
                <p><strong>Issue Date:</strong> {new Date(verifiedData.created_at).toLocaleDateString()}</p>
                <p><strong>Certificate ID:</strong> {verifiedData.cert_id}</p>
                <br/>
                <p className="text-sm font-semibold">Generated by:<br/>THIRANIX</p>
              </div>
              <button onClick={() => {setVerifiedData(null); setCertId('');}} className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors">
                Verify Another
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer onOpenPolicy={() => setShowPolicy(true)} />

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onOpenPolicy={() => setShowPolicy(true)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onOpenRegister={() => { setShowLogin(false); setShowRegister(true); }} onOpenForgot={() => { setShowLogin(false); setShowForgot(true); }} />}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} onOpenLogin={() => { setShowForgot(false); setShowLogin(true); }} />}
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}
    </div>
  );
}



function LandingPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen font-sans bg-[#f8fafc] text-slate-800 relative">
      <Header onOpenRegister={() => setShowRegister(true)} onOpenLogin={() => setShowLogin(true)} />
      <NotificationBanner onOpenRegister={() => setShowRegister(true)} />
      <Hero onOpenRegister={() => setShowRegister(true)} />
      <StatsCards />
      <InternshipTracks />
      <FAQ />
      <Footer onOpenPolicy={() => setShowPolicy(true)} />
      <ToastNotification />
      {showPopup && <PopupModal onClose={() => setShowPopup(false)} onOpenRegister={() => { setShowPopup(false); setShowRegister(true); }} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onOpenPolicy={() => setShowPolicy(true)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onOpenRegister={() => { setShowLogin(false); setShowRegister(true); }} onOpenForgot={() => { setShowLogin(false); setShowForgot(true); }} />}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} onOpenLogin={() => { setShowForgot(false); setShowLogin(true); }} />}
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}
    </div>
  );
}

function AdminDashboardPage() {
  const [stats, setStats] = useState({ total: 0, paid: 0, failed: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is logged in
    if (localStorage.getItem('isAdmin') !== 'true') {
      window.location.href = ROUTES.HOME;
      return;
    }

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching data", error);
          return;
        }

        if (data) {
          setUsers(data);
          
          let paid = 0;
          let failed = 0;
          data.forEach(user => {
             if (user.payment_status === 'success') paid++;
             if (user.payment_status === 'failed') failed++;
          });

          setStats({
            total: data.length,
            paid,
            failed
          });
        }
      } catch (e) {
        console.error('Error fetching admin data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    window.location.href = ROUTES.HOME;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Shield size={32} className="text-blue-600" />
            Aggregator Dashboard
          </h1>
          <button onClick={handleLogout} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm">
            Logout
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Loading statistics...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Registrations</span>
                <span className="text-4xl font-black text-blue-600">{stats.total}</span>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">Paid (Success)</span>
                <span className="text-4xl font-black text-green-500">{stats.paid}</span>
                <span className="text-xs text-gray-400 mt-2 font-medium">Ready for Razorpay</span>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2">Paid (Failed)</span>
                <span className="text-4xl font-black text-red-400">{stats.failed}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-slate-800">Recent Registrations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Domain</th>
                      <th className="px-6 py-4 font-semibold">Payment Status</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No registrations found.</td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{user.full_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-600">{user.email || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                              {user.domain || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.payment_status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-medium"><CheckCircle size={14} /> Paid</span>
                            ) : user.payment_status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 text-red-500 font-medium">Failed</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-500 font-medium">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OnboardingPage() {
  const email = (localStorage.getItem('registeredEmail') || '').trim();
  const initialName = localStorage.getItem('registeredName') || '';
  
  const [legalName, setLegalName] = useState(initialName);
  const [collegeName, setCollegeName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [discountStatus, setDiscountStatus] = useState('none'); // 'none', 'invalid', 'eyuv', 'founder'
  const [certificateFee, setCertificateFee] = useState(199);

  const applyReferral = () => {
    const code = referralCode.trim();
    if (code === 'Eyuv345') {
      setDiscountStatus('eyuv');
      setCertificateFee(60);
    } else if (code === 'Vishwas1409') {
      setDiscountStatus('founder');
      setCertificateFee(1);
    } else if (code === '') {
      setDiscountStatus('none');
      setCertificateFee(199);
    } else {
      setDiscountStatus('invalid');
      setCertificateFee(199);
    }
  };

  useEffect(() => {
    if (!email) {
      window.location.href = ROUTES.HOME;
    }
  }, [email]);

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (email) {
      try {
        await supabase
          .from('registrations')
          .update({ full_name: legalName })
          .ilike('email', email);
      } catch (err) {
        console.error(err);
      }
    }
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: certificateFee * 100, currency: 'INR' })
      });
      const order = await response.json();
      
      if (!response.ok) throw new Error(order.error || 'Failed to create order');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Thiranix Internship",
        description: "Administrative Fee",
        image: window.location.origin + "/thiranix_logo.png",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_BASE}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
               const certId = 'Cert-' + Math.random().toString(36).substr(2, 9).toUpperCase();
               const studentId = 'Stud-' + Math.random().toString(36).substr(2, 9).toUpperCase();
               const domain = localStorage.getItem('registeredDomain') || 'FullStack Developer';
               
               await supabase.from('registrations').update({ 
                  payment_status: 'success',
                  college_name: collegeName,
                  cert_id: certId,
                  student_id: studentId
               }).ilike('email', email);
               
               alert('Payment successful! Generating your verified certificate now...');
               await generateCertificate(legalName, collegeName, domain, certId, studentId);
               window.location.href = ROUTES.STUDENT_DASHBOARD; 
            } else {
               await supabase.from('registrations').update({ payment_status: 'failed' }).ilike('email', email);
               alert('Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            alert('Payment verification error');
          }
        },
        prefill: {
          name: legalName,
          email: email
        },
        theme: { color: "#2563eb" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async function (response) {
        console.error(response.error);
        await supabase.from('registrations').update({ payment_status: 'failed' }).ilike('email', email);
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#f8fafc] text-slate-800 relative flex flex-col">
      <Header onOpenRegister={() => {}} onOpenLogin={() => {}} />
      
      <main className="flex-1 flex items-center justify-center p-6 animate-[fade-in_0.3s_ease-out]">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🎓</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">Final Step: Onboarding</h1>
            <p className="text-gray-500 text-sm mt-2">Complete your profile to activate your internship</p>
          </div>

          <form onSubmit={handlePay} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name (Legal as per College)</label>
              <input 
                type="text" 
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Enter your exact legal name" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">College Name</label>
              <input 
                type="text" 
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="Enter your full college name" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Internship Domain Duration</label>
              <select disabled className="w-full bg-gray-100 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 opacity-70 cursor-not-allowed">
                <option>8-Week Virtual Technical Internship (Locked)</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  required
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  * For processing a certificate we may charge a minimal administrative fee of ₹{certificateFee} for administrative costs.
                </span>
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Referral Code (Optional)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code" 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
                <button type="button" onClick={applyReferral} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">Apply</button>
              </div>
              
              {discountStatus === 'eyuv' && (
                <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="font-bold">Referral Applied</p>
                  <p>Discount Activated</p>
                  <p className="mt-1 font-semibold">Certificate Fee: ₹60</p>
                </div>
              )}
              {discountStatus === 'founder' && (
                <div className="mt-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <p className="font-bold">Founder Referral Applied</p>
                  <p>Special Access Granted</p>
                  <p className="mt-1 font-semibold">Certificate Fee: ₹1</p>
                </div>
              )}
              {discountStatus === 'invalid' && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="font-bold">Invalid Referral Code</p>
                  <p className="mt-1 font-semibold">Normal Price: ₹199</p>
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={!agreed || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md shadow-blue-500/30 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {loading ? 'Processing...' : `Pay ₹${certificateFee} & get Certified`}
            </button>
          </form>
        </div>
      </main>
      
      <Footer onOpenPolicy={() => {}} />
    </div>
  );
}

function StudentDashboardPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('--- DASHBOARD SESSION VALIDATION ---');
    const fetchSession = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user || authError) {
        console.log('AUTH STATE: Not Logged In');
        console.log('SESSION NOT FOUND');
        window.location.href = ROUTES.HOME;
        return;
      }

      console.log('SESSION FOUND:', user.email);
      console.log('AUTH STATE: Authenticated');
      
      try {
        const { data, error } = await supabase.from('registrations').select('*').ilike('email', user.email).single();
        
        if (data && data.payment_status === 'success') {
          console.log('CURRENT USER:', data.full_name);
          setUserData(data);
        } else {
          window.location.href = ROUTES.ONBOARDING;
        }
        setLoading(false);
      } catch (e) {
        console.log('DB Fetch error. Redirecting to home.');
        window.location.href = ROUTES.HOME;
      }
    };
    fetchSession();
  }, []);

  const handleDownload = async () => {
    if (!userData) return;
    await generateCertificate(userData.full_name, userData.college_name, userData.domain, userData.cert_id, userData.student_id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen font-sans bg-[#f8fafc] text-slate-800 relative flex flex-col">
      <Header onOpenRegister={() => {}} onOpenLogin={() => {}} />
      <main className="flex-1 flex flex-col items-center justify-center p-6 mt-10 mb-20 animate-[fade-in_0.3s_ease-out]">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
              <span className="text-4xl">🎉</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 mb-4">Hello {userData.full_name} 👋</h1>
          <p className="text-gray-600 mb-8 text-lg">
            Congratulations!<br/>
            You have successfully completed the 8 Week Virtual Technical Internship Program.
          </p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 mb-8 text-left shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-wider text-sm">Internship Details</h3>
            <div className="space-y-4 text-slate-700">
               <div className="grid grid-cols-3"><span className="font-semibold text-slate-500">Student Name</span> <span className="col-span-2 font-medium">{userData.full_name}</span></div>
               <div className="grid grid-cols-3"><span className="font-semibold text-slate-500">College Name</span> <span className="col-span-2 font-medium">{userData.college_name}</span></div>
               <div className="grid grid-cols-3"><span className="font-semibold text-slate-500">Domain</span> <span className="col-span-2 font-medium">{(DOMAIN_MAP[userData.domain] || userData.domain)}</span></div>
               <div className="grid grid-cols-3"><span className="font-semibold text-slate-500">Duration</span> <span className="col-span-2 font-medium">8 Weeks</span></div>
               <div className="grid grid-cols-3"><span className="font-semibold text-slate-500">Status</span> <span className="col-span-2 font-bold text-blue-600">Completed</span></div>
               <div className="grid grid-cols-3"><span className="font-semibold text-slate-500">Certificate Status</span> <span className="col-span-2 font-bold text-emerald-600">Issued</span></div>
            </div>
          </div>

          <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg shadow-md shadow-blue-500/20 transition-all text-lg w-full flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Official Certificate
          </button>
        </div>
      </main>
      <Footer onOpenPolicy={() => {}} />
    </div>
  );
}

export default function App() {
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
}
