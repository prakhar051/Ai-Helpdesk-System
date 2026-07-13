const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

async function main() {
  console.log('Starting demo database seeding...');

  // ==========================================
  // 1. SEED CATEGORIES (20 Categories)
  // ==========================================
  const categoriesList = [
    { name: "Password Reset", description: "Account lockout, credentials expiration, and password recovery issues." },
    { name: "Email Issues", description: "Outlook sync, mail delivery, mailboxes full, and server connections." },
    { name: "Network", description: "Local office routing, physical switches, LAN connections, and proxy setups." },
    { name: "VPN", description: "Remote access Cisco AnyConnect, credentials validation, and network drops." },
    { name: "Printer", description: "Office printers, scan to email, toner requests, and driver installations." },
    { name: "Software Installation", description: "Standard utility installation, software licensing, and upgrades." },
    { name: "Hardware", description: "Peripheral setup, keyboards, mice, docking stations, and monitors." },
    { name: "Laptop", description: "Laptop provisioning, hardware upgrades, and performance tuning." },
    { name: "Desktop", description: "Workstation provisioning, hardware maintenance, and diagnostics." },
    { name: "Windows", description: "OS configuration, event logs, security updates, and BSOD recovery." },
    { name: "Linux", description: "Linux desktop provisioning, server commands, and printer drivers." },
    { name: "Office 365", description: "OneDrive, Excel, Word, licensing issues, and collaboration portals." },
    { name: "Microsoft Teams", description: "Teams logins, audio crackling, call quality, and video issues." },
    { name: "Internet", description: "WAN gateway latency, external website blocks, and WiFi disconnects." },
    { name: "Active Directory", description: "Domain logins, AD groups membership, and self-service lockouts." },
    { name: "Security", description: "MFA tokens setup, malware isolation, and data encryption keys." },
    { name: "Accounts", description: "Access privileges, onboarding credentials, and profile changes." },
    { name: "Database", description: "SQL permissions, connection timeouts, and query latency." },
    { name: "Cloud", description: "Azure portals, AWS credentials, and OneDrive cloud sync." },
    { name: "Other", description: "General support issues not covered by standard category labels." }
  ];

  const dbCategories = [];
  for (const cat of categoriesList) {
    const upserted = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true },
      create: { name: cat.name, description: cat.description, isActive: true }
    });
    dbCategories.push(upserted);
  }
  console.log('✔ Categories Created');

  // ==========================================
  // 2. SEED USERS
  // ==========================================
  // Hash passwords
  const customerHashed = await bcrypt.hash('qwerty123', 10);
  const generalHashed = await bcrypt.hash('password123', 10);

  // Core target accounts
  const customer1 = await prisma.user.upsert({
    where: { email: 'yadavprakhar51@gmail.com' },
    update: { name: 'Prakhar Customer 51', password: customerHashed, role: 'CUSTOMER', isActive: true },
    create: { email: 'yadavprakhar51@gmail.com', name: 'Prakhar Customer 51', password: customerHashed, role: 'CUSTOMER', isActive: true }
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'yadavprakhhar@gmail.com' },
    update: { name: 'Prakhar Customer', password: customerHashed, role: 'CUSTOMER', isActive: true },
    create: { email: 'yadavprakhhar@gmail.com', name: 'Prakhar Customer', password: customerHashed, role: 'CUSTOMER', isActive: true }
  });

  // Additional Customers (10)
  const dbCustomers = [customer1, customer2];
  for (let i = 1; i <= 10; i++) {
    const email = `customer${i}@demohd.com`;
    const cust = await prisma.user.upsert({
      where: { email },
      update: { name: `Customer User ${i}`, password: generalHashed, role: 'CUSTOMER', isActive: true },
      create: { email, name: `Customer User ${i}`, password: generalHashed, role: 'CUSTOMER', isActive: true }
    });
    dbCustomers.push(cust);
  }

  // Agents (5)
  const dbAgents = [];
  for (let i = 1; i <= 5; i++) {
    const email = `agent${i}@demohd.com`;
    const agt = await prisma.user.upsert({
      where: { email },
      update: { name: `Agent Expert ${i}`, password: generalHashed, role: 'AGENT', isActive: true },
      create: { email, name: `Agent Expert ${i}`, password: generalHashed, role: 'AGENT', isActive: true }
    });
    dbAgents.push(agt);
  }

  // Admins (2)
  const dbAdmins = [];
  for (let i = 1; i <= 2; i++) {
    const email = `admin${i}@demohd.com`;
    const adm = await prisma.user.upsert({
      where: { email },
      update: { name: `System Administrator ${i}`, password: generalHashed, role: 'ADMIN', isActive: true },
      create: { email, name: `System Administrator ${i}`, password: generalHashed, role: 'ADMIN', isActive: true }
    });
    dbAdmins.push(adm);
  }
  console.log('✔ Users Created');

  // ==========================================
  // 3. SEED KNOWLEDGE BASE (40 Articles: 25 Published, 15 Draft)
  // ==========================================
  const kbTemplates = [
    { title: "How to Self-Service Reset Your Windows Password", summary: "Step-by-step guide to reset your Windows domain password securely.", content: "To reset your Windows login password, visit https://ssp.company.com on any active browser or click 'Reset Password' on the login screen. You will be prompted to enter your domain email and answer your security questions. A one-time passcode will be sent to your registered mobile device. Once entered, specify a new password that contains uppercase, lowercase, numbers, and symbols.", tags: ["password", "windows", "reset", "domain"] },
    { title: "Troubleshooting VPN Connection Drops at Home", summary: "Common causes and resolutions for periodic VPN disconnection.", content: "If your remote VPN client drops connections frequently: 1) Verify you are not on double NAT (multiple home routers). 2) Check if your router firmware is up to date. 3) Disable IPv6 in your home adapter properties. 4) Use an ethernet cable instead of WiFi. 5) If using Cisco AnyConnect, check that MTU is configured to 1300 to prevent packet fragmentation.", tags: ["vpn", "connection", "drops", "anyconnect"] },
    { title: "Outlook Sync Latency Issues and Fixes", summary: "Resolving delays in email delivery and folder updates.", content: "If you experience delays in receiving emails, perform these troubleshooting steps: 1) Check Outlook Connection Status in status bar. 2) Toggle Cached Exchange Mode by navigating to File > Account Settings > Change, and uncheck/re-check the cache slider. 3) Rebuild your offline index (OST file) by renaming the old OST file inside AppData\\Local\\Microsoft\\Outlook while the app is closed.", tags: ["outlook", "email", "sync", "exchange"] },
    { title: "Resolving Common Windows Update Failure Errors", summary: "How to clear update caches and retry failing installations.", content: "To resolve Windows Update errors such as 0x80070002: 1) Open Command Prompt as Administrator. 2) Stop update services: net stop wuauserv and net stop bits. 3) Navigate to C:\\Windows\\SoftwareDistribution and delete all files inside. 4) Restart update services: net start wuauserv and net start bits. 5) Run updates check again.", tags: ["windows", "updates", "failure", "patching"] },
    { title: "Installing Office 365 Enterprise Suite", summary: "Installation guide for Office 365 programs on workstations.", content: "Log in to portal.office.com using your corporate email account. In the top right corner, click 'Install Apps' and select 'Microsoft 365 apps'. Run the downloaded Setup.exe. The installation wizard will run in the background. Once completed, launch Word or Excel and sign in to activate the license.", tags: ["office", "word", "excel", "install", "licensing"] },
    { title: "Connecting to the Office Network Printer", summary: "Mapping printers based on office locations.", content: "To connect to office printers: 1) Press Win+R, type \\\\printserver.company.com and press Enter. 2) Double-click the printer named after your floor or room (e.g. PR-FL2-CORRIDOR). 3) The drivers will download and install automatically. 4) Print a test page to verify alignment.", tags: ["printer", "network", "printing", "hp", "canon"] },
    { title: "Clearing Browser Cache to Fix Portal Errors", summary: "How to resolve rendering and session errors in web browsers.", content: "If web applications display old data or session loops: 1) In Chrome or Edge, press Ctrl+Shift+Delete. 2) Select 'All time' range. 3) Check 'Cookies' and 'Cached images'. 4) Click Clear Data. 5) Restart your browser and reload the portal page.", tags: ["chrome", "edge", "cache", "cookies", "browser"] },
    { title: "Fixing Microsoft Teams Login and Credential Loops", summary: "Resolving MFA loop and authentication errors in Teams desktop.", content: "When Teams desktop gets stuck in a login loop: 1) Right-click Teams in taskbar and select Quit. 2) Press Win+R, type %appdata%\\Microsoft\\Teams and delete all files. 3) Open Windows Credential Manager and delete all credentials starting with MicrosoftAccount:user=. 4) Relaunch Teams and authenticate.", tags: ["teams", "login", "credentials", "mfa"] },
    { title: "Configuring Remote Desktop Client Access", summary: "Guide to establishing secure remote desktop connection.", content: "To access your office desktop remotely: 1) Connect to corporate VPN first. 2) Launch Remote Desktop Connection (mstsc). 3) Enter the computer's hostname (e.g., WK-PC-102.domain.internal). 4) Enter credentials as domain\\username. 5) Click Connect.", tags: ["rdp", "remote", "desktop", "mstsc"] },
    { title: "Basic Network and WiFi Troubleshooting Guide", summary: "Resolving local network disconnects and packet loss.", content: "If you cannot connect to the network: 1) Check if the network adapter is enabled. 2) Open CMD, type ipconfig /release and ipconfig /renew. 3) Ping the gateway 192.168.1.1 to check connection. 4) Verify DNS configurations using nslookup google.com.", tags: ["network", "wifi", "dns", "ping", "internet"] },
    { title: "Enabling Multi-Factor Authentication (MFA)", summary: "Registering mobile devices with Microsoft Authenticator.", content: "To register your device: 1) Navigate to aka.ms/mfasetup on your PC. 2) Download Microsoft Authenticator on your mobile phone. 3) Click 'Add Account' > 'Work or school account' on your phone. 4) Scan the QR code displayed on your PC screen. 5) Verify the prompt number to finish onboarding.", tags: ["mfa", "authenticator", "security", "token"] },
    { title: "Tips to Optimize Slow Laptop Boot Performance", summary: "Resolving high memory usage and starting speed lag.", content: "To speed up sluggish laptops: 1) Open Task Manager, navigate to 'Startup apps' tab, and disable unnecessary startup items. 2) Ensure at least 15% of your SSD storage is free. 3) Run disk cleanup utilities. 4) Close browser tabs that memory leaks.", tags: ["laptop", "performance", "boot", "speed", "disk"] },
    { title: "Fixing OneDrive Sync Stuck at Processing", summary: "Troubleshooting files sync delays in OneDrive.", content: "If OneDrive is stuck syncing changes: 1) Right-click OneDrive icon and select Close. 2) Press Win+R, type %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset. 3) OneDrive will close and restart. 4) Alternatively, check for files with invalid characters like <, >, or | in their names.", tags: ["onedrive", "sync", "cloud", "files"] },
    { title: "Recovering Accidentally Deleted Network Files", summary: "Restoring deleted items using shadow copy volumes.", content: "If you deleted a file from a shared drive: 1) Right-click the parent folder of the deleted file and select Properties. 2) Go to the 'Previous Versions' tab. 3) Select the backup volume corresponding to the date needed. 4) Click Open, find your file, and copy it back.", tags: ["network share", "restore", "backup", "files"] },
    { title: "Active Directory Domain Password Expired Fix", summary: "Resolving login locks due to expired AD credentials.", content: "If your password has expired and you cannot log in: 1) Connect your laptop via ethernet in the office network. 2) Boot machine and try logging in. 3) If remote, use the self-service web portal at https://password.company.com to update and sync your domain credentials.", tags: ["active directory", "password", "expired", "domain"] },
    { title: "Resolving SQL Database Access Denied Errors", summary: "Checking database reader role mapping.", content: "When encountering Access Denied (Error 229) in SQL Server: 1) Check if your Active Directory account is member of 'DB_READERS' AD group. 2) Force group policy updates on your PC by running gpupdate /force. 3) Reconnect SQL Server Management Studio and retry query.", tags: ["database", "sql", "permissions", "denied"] },
    { title: "Setting Up Printers on Linux Ubuntu Desktops", summary: "CUPS printer setup guides for Ubuntu Linux developers.", content: "To install office printer on Linux: 1) Navigate to http://localhost:631 in browser. 2) Go to Administration > Add Printer. 3) Select AppSocket/HP JetDirect. 4) Input socket://printserver.company.com:9100. 5) Select correct PPD model drivers and save.", tags: ["linux", "ubuntu", "printer", "cups"] },
    { title: "Setting Up Corporate Email on Mobile Devices", summary: "Syncing Outlook mailbox on iOS and Android devices.", content: "To read email on your phone: 1) Download Microsoft Outlook from App Store or Play Store. 2) Open app, input your corporate email, and click Add Account. 3) Authenticate with MFA. 4) Wait 5 minutes for mails, calendars, and contacts sync.", tags: ["email", "mobile", "outlook", "ios", "android"] },
    { title: "Cleaning and Cooling Overheating Laptops", summary: "Tips to fix thermal throttling and fan noises.", content: "If your laptop fan is running loud and CPU is hot: 1) Check task manager for processes consuming high CPU usage. 2) Ensure air vents are not blocked. 3) Use a compressed air can to blow dust out of exhaust vents. 4) Elevate the back of the laptop.", tags: ["laptop", "overheating", "hardware", "cpu", "thermal"] },
    { title: "Mapping Department Shared Drives Natively", summary: "Natively map network folder paths in Windows Explorer.", content: "To map drive: 1) Open File Explorer, click 'This PC', select 'Map network drive'. 2) Choose a letter (e.g. N:). 3) In Folder field, enter path e.g. \\\\nas01\\finance. 4) Check 'Reconnect at sign-in'. 5) Click Finish.", tags: ["network", "shared drive", "folder", "nas"] }
  ];

  // We need exactly 40 articles. We will generate 2 variants for each of the 20 templates:
  // Variant A: Guide (Published / Draft)
  // Variant B: FAQ version (Published / Draft)
  // 25 must be PUBLISHED, 15 DRAFT.
  const dbArticles = [];
  let publishedCount = 0;

  for (let i = 0; i < kbTemplates.length; i++) {
    const template = kbTemplates[i];
    
    // Variant A: Guide
    const statusA = publishedCount < 25 ? 'PUBLISHED' : 'DRAFT';
    if (statusA === 'PUBLISHED') publishedCount++;

    const titleA = template.title;
    const slugA = generateSlug(titleA);
    
    // Variant B: FAQ
    const statusB = publishedCount < 25 ? 'PUBLISHED' : 'DRAFT';
    if (statusB === 'PUBLISHED') publishedCount++;

    const titleB = `FAQ: ${template.title}`;
    const slugB = generateSlug(titleB);

    // Save Variant A
    const artA = await prisma.article.upsert({
      where: { slug: slugA },
      update: { title: titleA, content: template.content, category: template.tags[0], tags: template.tags, status: statusA, isFaq: false, viewCount: 50 + (i * 3), authorId: dbAdmins[0].id },
      create: { title: titleA, slug: slugA, content: template.content, category: template.tags[0], tags: template.tags, status: statusA, isFaq: false, viewCount: 50 + (i * 3), authorId: dbAdmins[0].id }
    });
    dbArticles.push(artA);

    // Save Variant B
    const artB = await prisma.article.upsert({
      where: { slug: slugB },
      update: { title: titleB, content: `Frequently Asked Questions regarding ${template.title.toLowerCase()}: \n\nQ: What is the main utility of this configuration?\nA: ${template.summary}\n\nDetailed reference: ${template.content}`, category: template.tags[0], tags: [...template.tags, "faq"], status: statusB, isFaq: true, viewCount: 15 + (i * 2), authorId: dbAdmins[0].id },
      create: { title: titleB, slug: slugB, content: `Frequently Asked Questions regarding ${template.title.toLowerCase()}: \n\nQ: What is the main utility of this configuration?\nA: ${template.summary}\n\nDetailed reference: ${template.content}`, category: template.tags[0], tags: [...template.tags, "faq"], status: statusB, isFaq: true, viewCount: 15 + (i * 2), authorId: dbAdmins[0].id }
    });
    dbArticles.push(artB);
  }
  console.log('✔ Knowledge Base Created');

  // ==========================================
  // 4. SEED TICKETS (100 Tickets)
  // ==========================================
  // Clean up any old demo tickets to remain idempotent
  const demoUserIds = dbCustomers.map(c => c.id);
  const oldDemoTickets = await prisma.ticket.findMany({
    where: { customerId: { in: demoUserIds } }
  });
  const oldDemoTicketIds = oldDemoTickets.map(t => t.id);

  if (oldDemoTicketIds.length > 0) {
    await prisma.comment.deleteMany({ where: { ticketId: { in: oldDemoTicketIds } } });
    await prisma.attachment.deleteMany({ where: { ticketId: { in: oldDemoTicketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: oldDemoTicketIds } } });
  }

  const baseTickets = [
    { title: "Outlook calendar sync latency", desc: "Outlook calendar is not synchronizing with my mobile device. I missed my client appointments today due to the sync delay. Please resolve.", cat: "Office 365" },
    { title: "VPN connection drops periodically", desc: "The Cisco AnyConnect VPN client connects successfully but disconnects every 5 to 10 minutes. I am working from home on a fiber connection.", cat: "VPN" },
    { title: "Printer showing offline in Room 302", desc: "The main HP LaserJet printer in Room 302 is showing as offline. I tried restarting it but it still does not connect to the print server.", cat: "Printer" },
    { title: "Excel crashes on large worksheets", desc: "Excel crashes immediately when attempting to load files larger than 50MB containing pivot tables. This happens on multiple machines.", cat: "Office 365" },
    { title: "Adobe license activation error", desc: "Adobe Creative Cloud is displaying a 'License Expired' message, even though we have an active enterprise subscription.", cat: "Software Installation" },
    { title: "Monitor flickering at high refresh rate", desc: "My primary Dell monitor is flickering constantly when set to 144Hz. It works fine at 60Hz. I have tried changing the DisplayPort cable.", cat: "Hardware" },
    { title: "Active Directory account locked out", desc: "My Active Directory domain account gets locked out every morning as soon as I log in. There might be a cached credential on another device.", cat: "Active Directory" },
    { title: "WiFi disconnects every afternoon", desc: "The office WiFi network drops connections for all laptops in the south wing every day around 2 PM. Signals return after 15 minutes.", cat: "Internet" },
    { title: "Slow boot performance on laptop", desc: "My ThinkPad laptop takes over 5 minutes to boot to the login screen, and stays sluggish for another 10 minutes. Disk usage is 100%.", cat: "Laptop" },
    { title: "Blue screen of death on startup", desc: "Received a blue screen with stop code SYSTEM_SERVICE_EXCEPTION after installing the latest cumulative quality updates yesterday.", cat: "Windows" },
    { title: "Linux printer driver installation", desc: "Need assistance configuring the network printer on a machine running Ubuntu 22.04 LTS. The standard CUPS administration panel is locked.", cat: "Linux" },
    { title: "Microsoft Teams audio distortion", desc: "During video calls, the audio output crackles and becomes completely unintelligible. The microphone input is fine.", cat: "Microsoft Teams" },
    { title: "Cannot access network file share", desc: "Attempting to access the shared folder \\\\nas01\\departments\\finance returns a Network Path Not Found error. My coworkers can access it.", cat: "Network" },
    { title: "MFA notification not arriving", desc: "I am not receiving the Microsoft Authenticator push notifications when trying to log into the Azure portal. SMS code fallback works.", cat: "Security" },
    { title: "SQL access denied for database reader", desc: "Running select queries on the production customer DB returns a 'Select permission was denied on object' error. I am in the read group.", cat: "Database" },
    { title: "Power BI report loading timeout", desc: "The monthly sales dashboard in Power BI Service takes over 10 minutes to load and then crashes with a gateway timeout error.", cat: "Cloud" },
    { title: "External mouse not recognized", desc: "The USB wireless receiver for my Logitech mouse is not recognized by the laptop. Tried different USB ports and verified mouse batteries.", cat: "Hardware" },
    { title: "EventViewer log full warning", desc: "The system log in Event Viewer has reached its maximum size. Need guidelines on archiving old log directories safely.", cat: "Windows" },
    { title: "OneDrive sync status stuck", desc: "OneDrive sync icon shows a blue syncing status continuously but no files are uploaded. Stuck on 'Processing 3 changes'.", cat: "Cloud" },
    { title: "Chrome browser high memory leak", desc: "Google Chrome browser helper processes consume over 8GB of RAM when running only three tabs of the Jira portal. Sluggish browser.", cat: "Other" }
  ];

  // We generate 5 variations of the 20 templates to get exactly 100 tickets
  const ticketEntries = [];
  const deptVariants = ["Finance Office", "Sales Division", "HR Department", "Engineering Team", "Executive Desk"];
  
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const baseIndex = i % 20;
    const base = baseTickets[baseIndex];
    const dept = deptVariants[Math.floor(i / 20)];

    const title = `${dept}: ${base.title}`;
    const description = `Department specific details for issue:\n\n${base.desc}\n\nDevice: Workstation-${i + 1000}. Location: Office Block B, Floor ${i % 4}.`;

    // Map Category
    const dbCat = dbCategories.find(c => c.name === base.cat) || dbCategories.find(c => c.name === "Other");

    // Assign status (OPEN: 20, IN_PROGRESS: 20, PENDING: 15, RESOLVED: 30, CLOSED: 15)
    let status = 'OPEN';
    if (i >= 20 && i < 40) status = 'IN_PROGRESS';
    else if (i >= 40 && i < 55) status = 'PENDING';
    else if (i >= 55 && i < 85) status = 'RESOLVED';
    else if (i >= 85) status = 'CLOSED';

    // Assign priority (LOW: 20, MEDIUM: 35, HIGH: 30, URGENT: 15)
    let priority = 'LOW';
    if (i >= 20 && i < 55) priority = 'MEDIUM';
    else if (i >= 55 && i < 85) priority = 'HIGH';
    else if (i >= 85) priority = 'URGENT';

    // Dates spread over last 180 days
    const daysAgo = (i / 99) * 180;
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);

    // Assign customer and agent
    const customer = dbCustomers[i % dbCustomers.length];
    // Assign agents only if not OPEN status
    const agent = status !== 'OPEN' ? dbAgents[i % dbAgents.length] : null;

    const aiReason = `The AI classifier mapped this ticket to category "${base.cat}" and selected priority "${priority}" based on keyword metrics matching "${base.title}".`;

    ticketEntries.push({
      title,
      description,
      status,
      priority,
      customerId: customer.id,
      agentId: agent ? agent.id : null,
      categoryId: dbCat ? dbCat.id : null,
      aiReason,
      createdAt,
      updatedAt
    });
  }

  // Insert tickets sequentially to satisfy autoincrement sequence trigger safely
  const dbTickets = [];
  for (const tEntry of ticketEntries) {
    const created = await prisma.ticket.create({
      data: tEntry
    });
    dbTickets.push(created);
  }
  console.log('✔ Tickets Created');

  // ==========================================
  // 5. SEED COMMENTS (500+ Comments, 5 per ticket)
  // ==========================================
  const commentEntries = [];
  
  for (let i = 0; i < dbTickets.length; i++) {
    const ticket = dbTickets[i];
    
    // Retrieve associated customer and agent
    const customer = dbCustomers[i % dbCustomers.length];
    const agent = dbAgents[i % dbAgents.length];

    const tStart = ticket.createdAt.getTime();
    const tEnd = ticket.updatedAt.getTime();
    const step = (tEnd - tStart) / 5;
    const dateAt = (stepIndex) => new Date(tStart + stepIndex * step + Math.random() * 10000);

    const status = ticket.status;

    if (status === 'RESOLVED' || status === 'CLOSED') {
      commentEntries.push({
        content: `Hi support, I am opening this ticket regarding ${ticket.title.toLowerCase()}. The issue details: ${ticket.description}`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(0)
      });
      commentEntries.push({
        content: `Thanks for the details. I am currently examining the network gateway metrics and active domain logs.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(1)
      });
      commentEntries.push({
        content: `I have updated your account profile privileges and refreshed the sync services on our endpoint. Please clear your cache and log back in.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(2)
      });
      commentEntries.push({
        content: `I just tried logging back in after clearing the cache, and the issue is completely resolved now! Thank you.`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(3)
      });
      commentEntries.push({
        content: `Excellent! Glad that resolved it. I am marking this ticket as resolved.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(4)
      });
    } else if (status === 'IN_PROGRESS' || status === 'PENDING') {
      commentEntries.push({
        content: `Urgent ticket: ${ticket.title}. We cannot execute daily processes due to this block.`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(0)
      });
      commentEntries.push({
        content: `Understood, I am on it. Can you confirm if you receive any error code or details on your monitor?`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(1)
      });
      commentEntries.push({
        content: `Yes, it throws a connection timeout error. I have attached the diagnostic logs for your review.`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(2)
      });
      commentEntries.push({
        content: `Got the logs. This looks like a routing issue inside the primary cloud database cluster. I have opened a high-priority incident with the engineering team.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(3)
      });
      commentEntries.push({
        content: `Status Update: The database team is currently restoring a backup replication block to sync the missing tables. Stand by.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(4)
      });
    } else {
      // OPEN tickets
      commentEntries.push({
        content: `Request submitted: ${ticket.description}`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(0)
      });
      commentEntries.push({
        content: `Auto-Analysis: The tickets parser is running background searches to classify your issue.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(1)
      });
      commentEntries.push({
        content: `Hi support, has an agent started working on this? This has blocked the daily operations pipeline.`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(2)
      });
      commentEntries.push({
        content: `Hi customer, we have queued this ticket in our urgent queue. An agent will be assigned shortly.`,
        ticketId: ticket.id,
        authorId: agent.id,
        createdAt: dateAt(3)
      });
      commentEntries.push({
        content: `Understood, standing by for the assignment updates.`,
        ticketId: ticket.id,
        authorId: customer.id,
        createdAt: dateAt(4)
      });
    }
  }

  // Bulk insert comments
  await prisma.comment.createMany({
    data: commentEntries
  });
  console.log('✔ Comments Created');

  // ==========================================
  // 6. SEED ATTACHMENTS (150 Attachments)
  // ==========================================
  const attachmentEntries = [];
  
  // To get exactly 150:
  // Tickets 0-49: 2 attachments each = 100
  // Tickets 50-99: 1 attachment each = 50
  for (let i = 0; i < 100; i++) {
    const ticket = dbTickets[i];
    const customer = dbCustomers[i % dbCustomers.length];

    const fileTypes = [
      { name: 'error_log', ext: 'txt', mime: 'text/plain', size: 15402 },
      { name: 'screenshot_error', ext: 'png', mime: 'image/png', size: 345012 },
      { name: 'event_viewer_dump', ext: 'log', mime: 'text/plain', size: 8452 },
      { name: 'billing_invoice', ext: 'pdf', mime: 'application/pdf', size: 120450 },
      { name: 'network_capture', ext: 'zip', mime: 'application/zip', size: 2450123 }
    ];

    const typeIndex1 = i % 5;
    const type1 = fileTypes[typeIndex1];

    // Add first attachment
    attachmentEntries.push({
      filename: `demo_${type1.name}_${i}.${type1.ext}`,
      originalName: `${type1.name}_${i}.${type1.ext}`,
      filePath: `uploads/demo/demo_${type1.name}_${i}.${type1.ext}`,
      mimeType: type1.mime,
      fileSize: type1.size,
      ticketId: ticket.id,
      uploadedById: customer.id,
      createdAt: new Date(ticket.createdAt.getTime() + 10 * 60 * 1000) // 10 mins later
    });

    // Add second attachment for first 50 tickets
    if (i < 50) {
      const typeIndex2 = (i + 2) % 5;
      const type2 = fileTypes[typeIndex2];
      attachmentEntries.push({
        filename: `demo_${type2.name}_second_${i}.${type2.ext}`,
        originalName: `${type2.name}_second_${i}.${type2.ext}`,
        filePath: `uploads/demo/demo_${type2.name}_second_${i}.${type2.ext}`,
        mimeType: type2.mime,
        fileSize: type2.size,
        ticketId: ticket.id,
        uploadedById: customer.id,
        createdAt: new Date(ticket.createdAt.getTime() + 12 * 60 * 1000)
      });
    }
  }

  await prisma.attachment.createMany({
    data: attachmentEntries
  });

  console.log('✔ Attachments Created');
  console.log('✔ Demo database ready');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
