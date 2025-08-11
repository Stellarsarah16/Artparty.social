/**
 * Legal Pages Manager
 * Copyright (c) 2025 StellarCollab. All rights reserved.
 * 
 * Handles display of legal documents including Terms of Service,
 * Privacy Policy, DMCA Policy, and About page.
 */

// Legal page content
const LEGAL_CONTENT = {
    terms: {
        title: "Terms of Service",
        content: `
            <h1>Terms of Service</h1>
            <p><strong>Last updated:</strong> January 2025</p>
            
            <h2>1. Agreement to Terms</h2>
            <p>By accessing and using StellarCollab ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
            
            <h2>2. Description of Service</h2>
            <p>StellarCollab is a collaborative pixel art creation platform that allows users to create, edit, and share digital artwork in a collaborative environment.</p>
            
            <h2>3. User Accounts</h2>
            <p>To use certain features of the Service, you must register for an account. You are responsible for:</p>
            <ul>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Updating your information as necessary</li>
            </ul>
            
            <h2>4. User Content and Conduct</h2>
            <p>You retain ownership of the pixel art and content you create. However, by using the Service, you grant us a license to display, distribute, and store your content as necessary to provide the Service.</p>
            
            <p>You agree not to:</p>
            <ul>
                <li>Create content that is illegal, harmful, threatening, abusive, or offensive</li>
                <li>Infringe on the intellectual property rights of others</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Use the Service for any commercial purposes without permission</li>
                <li>Spam, harass, or abuse other users</li>
            </ul>
            
            <h2>5. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are owned by StellarCollab and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
            
            <h2>6. Privacy</h2>
            <p>Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.</p>
            
            <h2>7. Termination</h2>
            <p>We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including if you breach the Terms.</p>
            
            <h2>8. Disclaimer</h2>
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied, regarding the Service's operation or availability.</p>
            
            <h2>9. Limitation of Liability</h2>
            <p>In no event shall StellarCollab be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>
            
            <h2>10. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service.</p>
            
            <h2>11. Contact Information</h2>
            <p>If you have questions about these Terms, please contact us at: <a href="mailto:legal@artparty.social">legal@artparty.social</a></p>
        `
    },
    
    privacy: {
        title: "Privacy Policy",
        content: `
            <h1>Privacy Policy</h1>
            <p><strong>Last updated:</strong> January 2025</p>
            
            <h2>1. Information We Collect</h2>
            
            <h3>Personal Information</h3>
            <ul>
                <li>Username and email address (required for account creation)</li>
                <li>Profile information you choose to provide</li>
                <li>Communication preferences</li>
            </ul>
            
            <h3>Usage Information</h3>
            <ul>
                <li>Pixel art creations and modifications</li>
                <li>Canvas interactions and collaboration data</li>
                <li>Login times and session information</li>
                <li>Device and browser information</li>
            </ul>
            
            <h3>Technical Information</h3>
            <ul>
                <li>IP addresses and location data</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Error logs and performance data</li>
            </ul>
            
            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
                <li>Provide and maintain the Service</li>
                <li>Process your transactions and manage your account</li>
                <li>Improve our Service and develop new features</li>
                <li>Communicate with you about updates and support</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
            </ul>
            
            <h2>3. Information Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share information:</p>
            <ul>
                <li>With your consent</li>
                <li>To comply with legal requirements</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist in operating our Service</li>
                <li>In connection with a business transfer or merger</li>
            </ul>
            
            <h2>4. Data Security</h2>
            <p>We implement appropriate security measures to protect your information, including:</p>
            <ul>
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication requirements</li>
                <li>Secure hosting and backup procedures</li>
            </ul>
            
            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li>Access, update, or delete your personal information</li>
                <li>Export your data in a portable format</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Withdraw consent where processing is based on consent</li>
                <li>Lodge a complaint with supervisory authorities</li>
            </ul>
            
            <h2>6. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to enhance your experience. You can control cookie settings through your browser preferences.</p>
            
            <h2>7. Data Retention</h2>
            <p>We retain your information for as long as necessary to provide the Service and fulfill legal obligations. You may request deletion of your account and associated data.</p>
            
            <h2>8. International Data Transfers</h2>
            <p>Your information may be processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers.</p>
            
            <h2>9. Children's Privacy</h2>
            <p>Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
            
            <h2>10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or through the Service.</p>
            
            <h2>11. Contact Us</h2>
            <p>For privacy-related questions or requests, contact us at: <a href="mailto:privacy@artparty.social">privacy@artparty.social</a></p>
        `
    },
    
    dmca: {
        title: "DMCA Policy",
        content: `
            <h1>Digital Millennium Copyright Act (DMCA) Policy</h1>
            <p><strong>Last updated:</strong> January 2025</p>
            
            <h2>1. Copyright Infringement Notification</h2>
            <p>StellarCollab respects intellectual property rights and responds to clear notices of alleged copyright infringement in accordance with the Digital Millennium Copyright Act (DMCA).</p>
            
            <h2>2. Filing a DMCA Notice</h2>
            <p>If you believe your copyrighted work has been infringed, please provide our DMCA Agent with a written notice containing:</p>
            
            <ul>
                <li>Your physical or electronic signature</li>
                <li>Identification of the copyrighted work claimed to be infringed</li>
                <li>Identification of the allegedly infringing material and its location on our Service</li>
                <li>Your contact information (address, phone number, email)</li>
                <li>A statement of good faith belief that the use is not authorized</li>
                <li>A statement that the information is accurate and you are authorized to act</li>
            </ul>
            
            <h2>3. DMCA Agent Contact Information</h2>
            <p>Send DMCA notices to our designated agent:</p>
            <p>
                <strong>DMCA Agent</strong><br>
                StellarCollab<br>
                Email: <a href="mailto:dmca@artparty.social">dmca@artparty.social</a><br>
                Subject Line: "DMCA Takedown Request"
            </p>
            
            <h2>4. Counter-Notification Process</h2>
            <p>If you believe your content was removed in error, you may file a counter-notification containing:</p>
            
            <ul>
                <li>Your physical or electronic signature</li>
                <li>Identification of the removed material and its former location</li>
                <li>A statement under penalty of perjury that removal was due to mistake or misidentification</li>
                <li>Your contact information and consent to jurisdiction</li>
            </ul>
            
            <h2>5. Response to Infringement</h2>
            <p>Upon receiving a valid DMCA notice, we will:</p>
            <ul>
                <li>Remove or disable access to the allegedly infringing content</li>
                <li>Notify the user who posted the content</li>
                <li>Terminate repeat offenders' accounts</li>
            </ul>
            
            <h2>6. False Claims</h2>
            <p>Making false DMCA claims may result in legal liability. Ensure your notice is accurate and made in good faith.</p>
            
            <h2>7. Repeat Infringer Policy</h2>
            <p>We maintain a policy of terminating accounts of users who are repeat copyright infringers.</p>
            
            <h2>8. Contact Information</h2>
            <p>For questions about this DMCA Policy, contact: <a href="mailto:legal@artparty.social">legal@artparty.social</a></p>
        `
    },
    
    about: {
        title: "About StellarCollab",
        content: `
            <h1>About StellarCollab</h1>
            
            <h2>Our Mission</h2>
            <p>StellarCollab is a collaborative pixel art creation platform designed to bring artists together in a shared creative space. We believe in the power of community-driven art and the magic that happens when creative minds collaborate.</p>
            
            <h2>What We Do</h2>
            <p>Our platform provides:</p>
            <ul>
                <li><strong>Collaborative Canvas:</strong> Work together on large-scale pixel art projects</li>
                <li><strong>Real-time Editing:</strong> See changes as they happen with live collaboration</li>
                <li><strong>Tile-based System:</strong> Organized creation with individual tile ownership</li>
                <li><strong>Community Features:</strong> Share, like, and discover amazing artwork</li>
                <li><strong>Creative Tools:</strong> Professional-grade pixel art editing tools</li>
            </ul>
            
            <h2>Our Vision</h2>
            <p>We envision a world where creativity knows no boundaries, where artists from different backgrounds and skill levels can come together to create something beautiful and meaningful.</p>
            
            <h2>Technology</h2>
            <p>StellarCollab is built with modern web technologies:</p>
            <ul>
                <li>Real-time collaboration using WebSocket technology</li>
                <li>Responsive design for desktop and mobile devices</li>
                <li>Secure user authentication and data protection</li>
                <li>Scalable cloud infrastructure</li>
            </ul>
            
            <h2>Community Guidelines</h2>
            <p>We foster a welcoming and inclusive community where:</p>
            <ul>
                <li>Respect and kindness are paramount</li>
                <li>Original creativity is celebrated</li>
                <li>Collaboration is encouraged</li>
                <li>Learning and growth are supported</li>
            </ul>
            
            <h2>Open Source</h2>
            <p>StellarCollab is committed to open source principles. Parts of our codebase are available for community contribution and learning.</p>
            
            <h2>Contact Us</h2>
            <p>Have questions, suggestions, or just want to say hello?</p>
            <ul>
                <li>General inquiries: <a href="mailto:hello@artparty.social">hello@artparty.social</a></li>
                <li>Support: <a href="mailto:support@artparty.social">support@artparty.social</a></li>
                <li>Business: <a href="mailto:business@artparty.social">business@artparty.social</a></li>
            </ul>
            
            <h2>Copyright</h2>
            <p>&copy; 2025 StellarCollab. All rights reserved. Made with ❤️ for the creative community.</p>
        `
    }
};

/**
 * Show legal page in modal
 * @param {string} pageType - Type of legal page (terms, privacy, dmca, about)
 */
function showLegalPage(pageType) {
    const modal = document.getElementById('legal-modal');
    const title = document.getElementById('legal-modal-title');
    const content = document.getElementById('legal-content');
    
    if (!modal || !title || !content) {
        console.error('Legal modal elements not found');
        return;
    }
    
    const pageData = LEGAL_CONTENT[pageType];
    if (!pageData) {
        console.error('Legal page not found:', pageType);
        return;
    }
    
    title.textContent = pageData.title;
    content.innerHTML = pageData.content;
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // Track page view for analytics (if implemented)
    console.log(`Legal page viewed: ${pageType}`);
}

/**
 * Hide legal modal
 */
function hideLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('legal-modal');
    if (modal && e.target === modal) {
        hideLegalModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideLegalModal();
    }
});

// Make functions globally available
window.showLegalPage = showLegalPage;
window.hideLegalModal = hideLegalModal;
