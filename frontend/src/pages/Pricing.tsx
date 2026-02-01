import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  Brain, 
  // ✅ FIXED: Removed unused imports
  // Calendar, 
  BookOpen, 
  // MessageSquare,
  Users,
  GraduationCap,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import './Pricing.css';

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo' | 'pricing';

interface PricingProps {
  onNavigate?: (page: Page) => void;
  onSignIn?: () => void;
}

const Pricing: React.FC<PricingProps> = ({ onNavigate, onSignIn }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // ✅ FIXED: Removed unused variable 'plan' - using underscore to indicate intentionally unused
  const handleGetStarted = (_plan: string) => {
    if (onSignIn) {
      onSignIn();
    } else {
      window.location.href = '/';
    }
  };

  // ✅ FIXED: Removed unused function handleBackClick
  // const handleBackClick = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   if (onNavigate) {
  //     onNavigate('dashboard');
  //   }
  // };

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for getting started with smart studying',
      price: {
        monthly: 0,
        annual: 0,
      },
      icon: BookOpen,
      color: '#6B9080',
      popular: false,
      features: [
        { name: 'AI-Generated Notes', included: true },
        { name: 'Microsoft To Do Integration', included: true },
        { name: 'Assignment Deadline Tracking', included: true },
        { name: 'Related Notes for Assignments', included: true },
        { name: 'Basic Calendar View', included: true },
        { name: 'Manual Study Tracking', included: true },
        { name: 'Study Plan Scheduler', included: false },
        { name: 'AI Questions on Notes', included: false },
        { name: 'AI Questions on Materials', included: false },
        { name: 'Spaced Repetition System', included: false },
      ],
    },
    {
      name: 'Premium Individual',
      description: 'Unlock AI-powered study features',
      price: {
        monthly: 9.99,
        annual: 99,
      },
      icon: Sparkles,
      color: '#E76F51',
      popular: true,
      features: [
        { name: 'Everything in Free', included: true, highlight: true },
        { name: 'AI Study Plan Scheduler', included: true },
        { name: 'Ask AI Questions on Your Notes', included: true },
        { name: 'AI Questions on Assignment Materials', included: true },
        { name: 'Advanced Spaced Repetition', included: true },
        { name: 'Performance Analytics', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Unlimited Note Generation', included: true },
        { name: 'Custom Study Goals', included: true },
        { name: 'Export Study Reports', included: true },
      ],
    },
    {
      name: 'Enterprise',
      description: 'For universities and educational institutions',
      price: {
        monthly: 'Custom',
        annual: 'Custom',
      },
      icon: Users,
      color: '#A4C3B2',
      popular: false,
      enterprise: true,
      features: [
        { name: 'Everything in Premium', included: true, highlight: true },
        { name: 'Student & Professor Views', included: true },
        { name: 'AI Quiz Generation for Professors', included: true },
        { name: 'Lecture Material Analysis', included: true },
        { name: 'Class Performance Analytics', included: true },
        { name: 'SSO Integration', included: true },
        { name: 'Custom Branding', included: true },
        { name: 'Dedicated Account Manager', included: true },
        { name: 'Priority Technical Support', included: true },
        { name: 'Usage Analytics & Reporting', included: true },
      ],
    },
  ];

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header">
        <div className="pricing-header-content">
          <a href="/" className="back-link">
             Back to Home
          </a>
          <div className="header-badge">
            <Sparkles size={16} />
            <span>AI-Powered Learning</span>
          </div>
          <h1>Choose Your Plan</h1>
          <p>Start free, upgrade when you need more power</p>

          {/* Billing Toggle */}
          <div className="billing-toggle">
            <button
              className={billingCycle === 'monthly' ? 'active' : ''}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={billingCycle === 'annual' ? 'active' : ''}
              onClick={() => setBillingCycle('annual')}
            >
              Annual
              <span className="save-badge">Save 17%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="pricing-container">
        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">
                  <Zap size={14} />
                  <span>Most Popular</span>
                </div>
              )}

              <div className="card-header">
                <div className="plan-icon" style={{ backgroundColor: plan.color }}>
                  <plan.icon size={24} />
                </div>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>

              <div className="card-price">
                {plan.enterprise ? (
                  <div className="price-custom">
                    <span className="price-amount">Custom</span>
                    <span className="price-label">Contact sales</span>
                  </div>
                ) : (
                  <>
                    <span className="price-currency">$</span>
                    <span className="price-amount">
                      {billingCycle === 'monthly'
                        ? plan.price.monthly
                        : typeof plan.price.annual === 'number'
                        ? (plan.price.annual / 12).toFixed(2)
                        : plan.price.annual}
                    </span>
                    <span className="price-period">
                      {plan.price.monthly === 0 ? 'forever' : '/month'}
                    </span>
                  </>
                )}
                {/* ✅ FIXED: Convert to number before comparison */}
                {billingCycle === 'annual' && !plan.enterprise && Number(plan.price.monthly) > 0 && (
                  <div className="price-annual">
                    Billed ${plan.price.annual} annually
                  </div>
                )}
              </div>

              <button
                className={`cta-button ${plan.popular ? 'primary' : ''}`}
                onClick={() => handleGetStarted(plan.name)}
              >
                {plan.enterprise ? 'Contact Sales' : plan.price.monthly === 0 ? 'Get Started Free' : 'Start Free Trial'}
              </button>

              <div className="features-list">
                {plan.features.map((feature, index) => (
                  <div
                    key={index}
                    className={`feature-item ${!feature.included ? 'disabled' : ''} ${feature.highlight ? 'highlight' : ''}`}
                  >
                    {feature.included ? (
                      <Check size={18} className="check-icon" />
                    ) : (
                      <X size={18} className="x-icon" />
                    )}
                    <span>{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="feature-comparison">
        <h2>Feature Comparison</h2>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Premium</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AI-Generated Notes</td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>Microsoft To Do Integration</td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>Assignment Tracking</td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>AI Study Plan Scheduler</td>
                <td><X size={18} /></td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>AI Questions on Notes</td>
                <td><X size={18} /></td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>Spaced Repetition System</td>
                <td><X size={18} /></td>
                <td><Check size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>Professor Dashboard</td>
                <td><X size={18} /></td>
                <td><X size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>AI Quiz Generation</td>
                <td><X size={18} /></td>
                <td><X size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
              <tr>
                <td>SSO Integration</td>
                <td><X size={18} /></td>
                <td><X size={18} /></td>
                <td><Check size={18} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Section */}
      <div className="trust-section">
        <h2>Why Choose Productive?</h2>
        <div className="trust-grid">
          <div className="trust-item">
            <div className="trust-icon">
              <Brain size={32} />
            </div>
            <h3>AI-Powered Intelligence</h3>
            <p>Leveraging Azure OpenAI for smart study recommendations</p>
          </div>
          <div className="trust-item">
            <div className="trust-icon">
              <Shield size={32} />
            </div>
            <h3>Secure & Private</h3>
            <p>Enterprise-grade security with Microsoft authentication</p>
          </div>
          <div className="trust-item">
            <div className="trust-icon">
              <TrendingUp size={32} />
            </div>
            <h3>Proven Results</h3>
            <p>Students improve study efficiency by an average of 40%</p>
          </div>
          <div className="trust-item">
            <div className="trust-icon">
              <GraduationCap size={32} />
            </div>
            <h3>Built for Students</h3>
            <p>Designed specifically for academic success</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>Can I switch plans later?</h3>
            <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div className="faq-item">
            <h3>Is there a free trial for Premium?</h3>
            <p>Yes, all Premium features are available for 14 days with no credit card required.</p>
          </div>
          <div className="faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.</p>
          </div>
          <div className="faq-item">
            <h3>How does Enterprise pricing work?</h3>
            <p>Enterprise pricing is customized based on number of users and specific needs. Contact our sales team for a quote.</p>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="pricing-cta">
        <h2>Ready to Transform Your Studying?</h2>
        <p>Join thousands of students already using Productive</p>
        <button className="cta-large" onClick={() => handleGetStarted('Premium')}>
          Start Free Trial
        </button>
      </div>
    </div>
  );
};

export default Pricing;