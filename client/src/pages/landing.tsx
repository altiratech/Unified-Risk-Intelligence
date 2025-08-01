import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Database, BarChart3, MapPin, Download, Brain } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="text-white text-sm" />
              </div>
              <h1 className="text-xl text-slate-900 font-semibold">ALTIRA TECHNOLOGIES</h1>
            </div>
            <Link href="/dashboard">
              <Button>
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-6">Unified Risk Intelligence</h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Consolidate fragmented data sources into a single dashboard with AI-enhanced analytics. 
            Built specifically for insurance carriers and reinsurers.
          </p>
          <Link href="/dashboard">
            <Button 
              size="lg" 
              className="px-8 py-3"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </section>
      {/* Features Grid */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Everything you need to assess and price risk
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Database className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Data Import & Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Import data from any source via open APIs, CSVs, or internal systems. 
                  Connect with Demex, Zesty.ai, Tomorrow.io, CoreLogic, and more.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="w-10 h-10 text-primary mb-4" />
                <CardTitle>AI-Assisted Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Normalize and enrich data with AI-assisted mapping and transformation. 
                  Machine learning uncovers patterns and builds risk scores automatically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Geospatial Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Visualize risk across portfolios in interactive geospatial formats. 
                  Overlay climate risk, cyber exposure, and catastrophe models.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Portfolio Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Run models on exposure, climate risk, cyber, and emerging threats. 
                  Get real-time insights into portfolio concentration and correlation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Download className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Export & Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Export insights back into underwriting workflows or BI tools. 
                  Integrate with Snowflake, Databricks, Excel, and policy admin systems.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Multi-tenant architecture with role-based access control. 
                  Audit trails and data lineage for regulatory compliance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Use Cases */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Built for Insurance Professionals
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Property CAT Aggregation</h3>
              <p className="text-slate-600">
                Aggregate exposure across geographies and assess catastrophe risk accumulation.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Climate Risk Dashboards</h3>
              <p className="text-slate-600">
                Monitor climate change impacts on your portfolio with real-time data feeds.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Cyber Exposure Mapping</h3>
              <p className="text-slate-600">
                Identify and quantify cyber risk exposure across your entire book of business.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to modernize your risk intelligence?
          </h2>
          <p className="text-xl text-slate-300 mb-8">Join leading carriers and reinsurers who trust Altira for their risk assessment needs.</p>
          <Link href="/dashboard">
            <Button 
              size="lg" 
              variant="secondary"
              className="px-8 py-3"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
