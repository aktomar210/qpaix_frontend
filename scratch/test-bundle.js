(() => {
  // js/service-use-cases-data.js
  var SERVICE_USE_CASES = {
    "software-development": {
      tabs: [
        {
          label: "Quality Assurance Testing",
          cards: [
            {
              title: "Description",
              text: "Rigorous quality assurance testing ensures that our software meets the highest standards of quality and reliability.",
              icon: "fa-solid fa-file-lines"
            },
            {
              title: "Functionality",
              text: "Comprehensive testing methodologies, including unit testing, integration testing, and end-to-end testing, validate the functionality, performance, and security of our solutions.",
              icon: "fa-solid fa-sliders"
            },
            {
              title: "Outcome",
              text: "Clients receive software products that are thoroughly tested, bug-free, and ready for deployment, ensuring a seamless user experience and minimizing post-release issues.",
              icon: "fa-solid fa-trophy"
            }
          ],
          image: "/images/services-image3.png"
        },
        {
          label: "Innovative Solutions Development",
          cards: [
            {
              title: "Description",
              text: "Our team thrives on innovation, constantly exploring new technologies and methodologies to deliver cutting-edge solutions.",
              icon: "fa-solid fa-lightbulb"
            },
            {
              title: "Functionality",
              text: "Agile development practices, continuous research, and experimentation enable us to create innovative software solutions that address evolving business needs and industry trends.",
              icon: "fa-solid fa-microchip"
            },
            {
              title: "Outcome",
              text: "Clients benefit from forward-thinking solutions that drive competitive advantage, enhance operational efficiency, and unlock new opportunities for growth and success.",
              icon: "fa-solid fa-rocket"
            }
          ],
          image: "/images/where_img1.png"
        },
        {
          label: "Efficient Deployment and Delivery",
          cards: [
            {
              title: "Description",
              text: "Our CI/CD pipeline facilitates efficient deployment and delivery of software updates, ensuring rapid time-to-market and continuous improvement.",
              icon: "fa-solid fa-box-archive"
            },
            {
              title: "Functionality",
              text: "Automated testing, code analysis, and deployment pipelines streamline the software delivery process, allowing for frequent releases and quick iteration cycles.",
              icon: "fa-solid fa-gears"
            },
            {
              title: "Outcome",
              text: "Clients experience faster release cycles, reduced time-to-market, and increased agility, enabling them to adapt to changing market demands and stay ahead of the competition.",
              icon: "fa-solid fa-chart-line"
            }
          ],
          image: "/images/services-image2.png"
        }
      ]
    },
    "enterprise-ai-solutions": {
      tabs: [
        {
          label: "Predictive Failure Detection",
          cards: [
            {
              title: "Description",
              text: "Deploying deep-learning regression models onto sensor telemetry streams to forecast equipment fatigue days before physical failure occurs.",
              icon: "fa-solid fa-brain"
            },
            {
              title: "Functionality",
              text: "Real-time vibration and thermal anomaly detection with noise-filtering Kalman filters built into the edge processing pipeline.",
              icon: "fa-solid fa-sliders"
            },
            {
              title: "Outcome",
              text: "42% reduction in unplanned machine downtime and 3.8x faster root-cause analysis for maintenance engineering teams.",
              icon: "fa-solid fa-trophy"
            }
          ],
          image: "/images/services-image3.png"
        },
        {
          label: "Document Intelligence",
          cards: [
            {
              title: "Description",
              text: "Multimodal document extraction parsing complex legal contracts, bilingual invoices, and claims in seconds with high accuracy.",
              icon: "fa-solid fa-file-shield"
            },
            {
              title: "Functionality",
              text: "Custom LLMs cross-verify document clauses against regulatory compliance policies with full audit logging trails.",
              icon: "fa-solid fa-shield-halved"
            },
            {
              title: "Outcome",
              text: "85% reduction in processing cycle times and 100% on-premises privacy with zero external data leakage.",
              icon: "fa-solid fa-award"
            }
          ],
          image: "/images/services-image1.png"
        },
        {
          label: "Visual Quality Inspection",
          cards: [
            {
              title: "Description",
              text: "GPU-accelerated computer vision scanning assembly lines for surface defects and soldering flaws at over 60 frames per second.",
              icon: "fa-solid fa-eye"
            },
            {
              title: "Functionality",
              text: "Sub-0.2mm precision optical micro-crack classification with immediate automated divert triggers before packaging.",
              icon: "fa-solid fa-camera-retro"
            },
            {
              title: "Outcome",
              text: "99.7% defect catch rate with sub-16ms inference per item and live defect heatmaps for supervisors.",
              icon: "fa-solid fa-circle-check"
            }
          ],
          image: "/images/services-image2.png"
        }
      ]
    },
    "data-analytics": {
      tabs: [
        {
          label: "Executive KPI Dashboards",
          cards: [
            {
              title: "Description",
              text: "Consolidating POS, inventory, and operational feeds across 40+ retail locations into a single unified data warehouse.",
              icon: "fa-solid fa-gauge"
            },
            {
              title: "Functionality",
              text: "Sub-5-minute data refresh pipelines feeding live executive dashboards accessible across web and mobile interfaces.",
              icon: "fa-solid fa-diagram-project"
            },
            {
              title: "Outcome",
              text: "Eliminated 6 hours of manual reporting lag daily and reduced store stockout incidents by 18%.",
              icon: "fa-solid fa-chart-line"
            }
          ],
          image: "/images/services-image4.png"
        },
        {
          label: "Churn & Retention Modeling",
          cards: [
            {
              title: "Description",
              text: "Predictive machine learning models trained on usage patterns, sentiment, and billing history to forecast customer churn.",
              icon: "fa-solid fa-user-gear"
            },
            {
              title: "Functionality",
              text: "Automated churn risk scoring embedded directly into CRM interfaces for proactive account manager intervention.",
              icon: "fa-solid fa-address-book"
            },
            {
              title: "Outcome",
              text: "45 days advance churn warning allowing targeted retention offers and a 23% reduction in overall churn.",
              icon: "fa-solid fa-shield-heart"
            }
          ],
          image: "/images/services-image5.png"
        },
        {
          label: "Financial Reporting Automation",
          cards: [
            {
              title: "Description",
              text: "Automated reconciliation and consolidation pipeline matching bank feeds against general ledger entries.",
              icon: "/images/output_oriented.png"
            },
            {
              title: "Functionality",
              text: "Variance drill-down reports linking high-level financial KPIs directly to underlying transactional records.",
              icon: "fa-solid fa-scale-balanced"
            },
            {
              title: "Outcome",
              text: "Reduced month-end closing time from 9 days down to 2 days with a 99.1% auto-reconciliation rate.",
              icon: "fa-solid fa-vault"
            }
          ],
          image: "/images/service_gallery_1.png"
        }
      ]
    },
    "iot-driven-solutions": {
      tabs: [
        {
          label: "Water Quality Monitoring",
          cards: [
            {
              title: "Description",
              text: "City-wide LPWAN sensor network continuously monitoring pH, turbidity, chlorine residual, and conductivity.",
              icon: "fa-solid fa-droplet"
            },
            {
              title: "Functionality",
              text: "Threshold auto-alerting dispatching SMS and email alerts to field teams within seconds of parameter breach.",
              icon: "fa-solid fa-tower-broadcast"
            },
            {
              title: "Outcome",
              text: "Under 30-second contamination detection window and 92% faster incident response times for utilities.",
              icon: "fa-solid fa-bullhorn"
            }
          ],
          image: "/images/hero-iot-embedded.webp"
        },
        {
          label: "Power Grid Monitoring",
          cards: [
            {
              title: "Description",
              text: "Feeder and transformer health monitoring tracking current, temperature, and vibration telemetry continuous streams.",
              icon: "fa-solid fa-bolt"
            },
            {
              title: "Functionality",
              text: "Predictive load-shedding algorithms calculating overload risk scores for grid operator control room dashboards.",
              icon: "fa-solid fa-plug-circle-bolt"
            },
            {
              title: "Outcome",
              text: "38% reduction in unplanned outages and 24/7 continuous health visibility across 340+ transformers.",
              icon: "fa-solid fa-solar-panel"
            }
          ],
          image: "/images/service_gallery_2.png"
        },
        {
          label: "Cold Chain Tracking",
          cards: [
            {
              title: "Description",
              text: "GPS-linked temperature and humidity sensors streaming live telemetry from shipping containers mid-transit.",
              icon: "fa-solid fa-temperature-low"
            },
            {
              title: "Functionality",
              text: "Real-time in-transit threshold alerting notifying drivers and dispatch when temperature drifts out of band.",
              icon: "fa-solid fa-truck-ramp-box"
            },
            {
              title: "Outcome",
              text: "99.3% of pharma shipments delivered strictly in-range with a 64% reduction in product spoilage losses.",
              icon: "fa-solid fa-snowflake"
            }
          ],
          image: "/images/service_gallery_3.png"
        }
      ]
    },
    "cloud-platform-services": {
      tabs: [
        {
          label: "Legacy-to-Cloud Migration",
          cards: [
            {
              title: "Description",
              text: "Phased migration of 15-year-old on-premise data centers to AWS with active database replication and zero data loss.",
              icon: "fa-solid fa-cloud-arrow-up"
            },
            {
              title: "Functionality",
              text: "Blue-green deployment strategy maintaining instant rollback capabilities throughout the migration window.",
              icon: "fa-solid fa-arrows-rotate"
            },
            {
              title: "Outcome",
              text: "35% reduction in annual infrastructure costs and complete decommission of legacy server hardware.",
              icon: "fa-solid fa-server"
            }
          ],
          image: "/images/services-image3.png"
        },
        {
          label: "CI/CD & DevOps Automation",
          cards: [
            {
              title: "Description",
              text: "Automated build, test, and release pipelines replacing manual deployment checklists and quarterly releases.",
              icon: "fa-solid fa-code-branch"
            },
            {
              title: "Functionality",
              text: "Automated test gates and infrastructure-as-code ensuring releases pass unit and integration checks.",
              icon: "fa-solid fa-gears"
            },
            {
              title: "Outcome",
              text: "90x increase in deployment frequency with under 2-minute automated rollback capabilities.",
              icon: "fa-solid fa-rocket"
            }
          ],
          image: "/images/services-image1.png"
        },
        {
          label: "Cost Optimization (FinOps)",
          cards: [
            {
              title: "Description",
              text: "Comprehensive cloud cost audit right-sizing compute instances to match actual CPU and memory utilization.",
              icon: "fa-solid fa-sack-dollar"
            },
            {
              title: "Functionality",
              text: "Automated idle shutdown schedules scaling non-production dev/staging environments to zero after hours.",
              icon: "fa-solid fa-chart-pie"
            },
            {
              title: "Outcome",
              text: "44% monthly cloud spend reduction with zero customer-facing performance regression.",
              icon: "fa-solid fa-piggy-bank"
            }
          ],
          image: "/images/services-image2.png"
        }
      ]
    },
    "drone-services": {
      tabs: [
        {
          label: "Topographic Survey Mapping",
          cards: [
            {
              title: "Description",
              text: "Fixed-wing RTK drone mapping sorties capturing centimeter-accurate elevation data across 800+ hectares.",
              icon: "fa-solid fa-map-location-dot"
            },
            {
              title: "Functionality",
              text: "Automated grid flight planning with onboard RTK ground control point cross-verification.",
              icon: "fa-solid fa-compass-drafting"
            },
            {
              title: "Outcome",
              text: "Reduced survey field time from 3 weeks down to 2 days with elevation accuracy within \xB12cm.",
              icon: "fa-solid fa-ruler-combined"
            }
          ],
          image: "/images/product-autopilot-uav.webp"
        },
        {
          label: "Infrastructure Inspection",
          cards: [
            {
              title: "Description",
              text: "Close-proximity drone inspections of 220kV transmission towers and telecom structures without line shutdowns.",
              icon: "fa-solid fa-tower-cell"
            },
            {
              title: "Functionality",
              text: "Dual optical and thermal payload zoom cameras detecting insulator hotspots and structural wear.",
              icon: "fa-solid fa-temperature-high"
            },
            {
              title: "Outcome",
              text: "Zero personnel at height risk, 140 towers inspected weekly, and 76% faster inspection turnaround.",
              icon: "fa-solid fa-shield-virus"
            }
          ],
          image: "/images/service-drone-services.webp"
        },
        {
          label: "Precision Agriculture",
          cards: [
            {
              title: "Description",
              text: "Weekly multispectral drone passes generating NDVI vegetation health maps across 1,200 acres of cropland.",
              icon: "fa-solid fa-seedling"
            },
            {
              title: "Functionality",
              text: "Automated translation of crop stress zones into variable-rate fertilizer and pesticide application maps.",
              icon: "fa-solid fa-leaf"
            },
            {
              title: "Outcome",
              text: "22% reduction in input costs and a 14% improvement in overall crop harvest yield.",
              icon: "fa-solid fa-wheat-awn"
            }
          ],
          image: "/images/service_img1.png"
        }
      ]
    }
  };
  var SERVICE_FEATURES = {
    "software-development": {
      pill: "ENGINEERING EXCELLENCE",
      title: "Core Features & <strong>Capabilities</strong>",
      subtitle: "Architectural standards and enterprise-grade software infrastructure built directly into every deployment.",
      features: [
        {
          title: "Custom Web & Mobile Engineering",
          desc: "Tailored web, mobile, and desktop applications engineered specifically to optimize business workflows, eliminate operational bottlenecks, and drive digital growth.",
          icon: "fa-solid fa-code",
          chips: ["Custom Web & Mobile", "Tailored Architecture"]
        },
        {
          title: "Technological Expertise & Stack",
          desc: "Leveraging modern frameworks, scalable microservices, RESTful/GraphQL APIs, and high-performance backend databases for enterprise reliability.",
          icon: "fa-solid fa-layer-group",
          chips: ["Microservices", "API-First Design"]
        },
        {
          title: "Agile Methodology & CI/CD",
          desc: "Iterative development cycles with continuous integration and automated deployment pipelines ensuring rapid releases based on real-time feedback.",
          icon: "fa-solid fa-rotate",
          chips: ["Agile Sprints", "Automated CI/CD"]
        },
        {
          title: "Enterprise Scalability",
          desc: "Modular and extensible system design engineered to seamlessly support growing enterprise workloads, transaction volumes, and user demand.",
          icon: "fa-solid fa-chart-line",
          chips: ["High Throughput", "Horizontal Scaling"]
        },
        {
          title: "Quality Assurance & Continuous Testing",
          desc: "Comprehensive end-to-end QA testing suites, unit tests, security penetration audits, and load testing to guarantee reliable, zero-downtime production releases.",
          icon: "fa-solid fa-vial-circle-check",
          chips: ["End-to-End QA", "Security Audits"]
        },
        {
          title: "Cross-Platform & Mobile Readiness",
          desc: "Native and hybrid mobile application development ensuring responsive, seamless user experience across iOS, Android, Web, and Desktop environments.",
          icon: "fa-solid fa-mobile-screen-button",
          chips: ["iOS & Android", "Responsive UX"]
        }
      ]
    },
    "enterprise-ai-solutions": {
      pill: "INTELLIGENT TRANSFORMATION",
      title: "Enterprise AI & <strong>Cognitive Features</strong>",
      subtitle: "Cutting-edge artificial intelligence, LLM fine-tuning, and computer vision embedded into core business processes.",
      features: [
        {
          title: "Custom LLM Fine-Tuning & RAG",
          desc: "Domain-specific LLM fine-tuning with LoRA / QLoRA adapters and vector-database Retrieval-Augmented Generation (RAG) pipelines with zero data leakage.",
          icon: "fa-solid fa-brain",
          chips: ["LoRA / QLoRA", "RAG Pipelines"]
        },
        {
          title: "Computer Vision & Defect Detection",
          desc: "Deep learning vision models for automated surface defect detection, quality control on manufacturing lines, OCR parsing, and object tracking.",
          icon: "fa-solid fa-eye",
          chips: ["Edge Vision", "Defect Detection"]
        },
        {
          title: "Predictive Asset Maintenance",
          desc: "Machine learning models analyzing real-time sensor streams to forecast equipment failure, schedule preventive repairs, and eliminate downtime.",
          icon: "fa-solid fa-chart-pie",
          chips: ["Predictive ML", "Zero Outages"]
        },
        {
          title: "Autonomous AI Agents & Workflows",
          desc: "Multi-agent autonomous AI assistants that perform complex multi-step tasks, document parsing, customer query resolution, and automated reporting.",
          icon: "fa-solid fa-robot",
          chips: ["Multi-Agent AI", "Workflow Automation"]
        },
        {
          title: "Natural Language Processing (NLP)",
          desc: "Multilingual NLP engines, sentiment analysis, contract intelligence, and voice AI capable of processing unstructured domain data into metrics.",
          icon: "fa-solid fa-comments",
          chips: ["Multilingual NLP", "Contract Mining"]
        },
        {
          title: "Hybrid & Air-Gapped AI Deployment",
          desc: "Deploy AI models on air-gapped on-premises hardware, low-power NVIDIA Jetson edge accelerators, or cloud GPU clusters with strict data governance.",
          icon: "fa-solid fa-shield-halved",
          chips: ["Air-Gapped Ready", "NVIDIA Jetson Edge"]
        }
      ]
    },
    "data-analytics": {
      pill: "DATA-DRIVEN INSIGHTS",
      title: "Advanced Analytics & <strong>Intelligence Capabilities</strong>",
      subtitle: "Consolidate raw operational data streams into real-time executive dashboards and predictive analytical models.",
      features: [
        {
          title: "Executive & Operational Dashboards",
          desc: "Real-time interactive BI dashboards consolidating telemetry, sales, inventory, and operations into customizable visual metrics for executive leadership.",
          icon: "fa-solid fa-chart-simple",
          chips: ["Real-Time BI", "Executive KPIs"]
        },
        {
          title: "Streaming Ingestion & ETL Pipelines",
          desc: "High-throughput data ingestion pipelines capable of processing millions of event logs per second with Apache Kafka, Spark, and automated data cleansing.",
          icon: "fa-solid fa-network-wired",
          chips: ["Kafka / Spark", "Sub-Second Ingestion"]
        },
        {
          title: "Predictive Analytics & Forecasting",
          desc: "Statistical learning models for demand forecasting, customer churn prediction, supply chain optimization, and market trend analysis.",
          icon: "fa-solid fa-arrow-trend-up",
          chips: ["Demand Forecast", "Churn Prevention"]
        },
        {
          title: "Data Warehousing & Governance",
          desc: "Centralized cloud data lakes and enterprise data warehouses with role-based access control (RBAC), data lineage, and compliance auditing.",
          icon: "fa-solid fa-database",
          chips: ["Data Lakehouse", "RBAC & Governance"]
        },
        {
          title: "Automated Financial Reconciliation",
          desc: "Intelligent algorithms reconciling multi-channel transactions, ledger entries, and vendor invoices with zero manual intervention.",
          icon: "fa-solid fa-calculator",
          chips: ["Automated Reconciliation", "Audit-Ready"]
        },
        {
          title: "Self-Service Business Intelligence",
          desc: "Empower non-technical teams with natural language query generation, ad-hoc drag-and-drop reporting, and automated scheduled PDF summaries.",
          icon: "fa-solid fa-sliders",
          chips: ["NL Queries", "Scheduled Reports"]
        }
      ]
    },
    "iot-driven-solutions": {
      pill: "HARDWARE & TELEMETRY",
      title: "Smart IoT & <strong>Edge Capabilities</strong>",
      subtitle: "Connect sensors, industrial machinery, and cloud networks for real-time monitoring and autonomous alerting.",
      features: [
        {
          title: "Municipal Water & Utility Telemetry",
          desc: "Smart IoT sensors monitoring pH, TDS, turbidity, chlorine levels, and pipe flow rate for JJM and Amrut 2.0 drinking water networks.",
          icon: "fa-solid fa-droplet",
          chips: ["JJM Compliant", "GSM / 4G / LoRa"]
        },
        {
          title: "Industrial Asset & Condition Monitoring",
          desc: "Continuous vibration, temperature, current, and voltage sensing on factory motors, transformers, and industrial pumps to prevent failures.",
          icon: "fa-solid fa-microchip",
          chips: ["Continuous Telemetry", "Vibration Sensing"]
        },
        {
          title: "Cold Chain & Environmental Sensing",
          desc: "Precision temperature, humidity, and location tracking for pharmaceutical logistics, cold storage units, and perishable goods transportation.",
          icon: "fa-solid fa-temperature-arrow-down",
          chips: ["Cold Chain Logistics", "Temp Alerting"]
        },
        {
          title: "Edge Computing & Gateway Integration",
          desc: "Low-latency edge gateways running localized data filtering, protocol translation (Modbus, BACnet, MQTT), and fallback offline storage.",
          icon: "fa-solid fa-server",
          chips: ["Modbus / MQTT", "Offline Store & Forward"]
        },
        {
          title: "Power & Transformer SCADA",
          desc: "Real-time monitoring of power quality, transformer oil temperature, load distribution, and automatic feeder fault detection.",
          icon: "fa-solid fa-bolt",
          chips: ["Power IoT SCADA", "Fault Detection"]
        },
        {
          title: "Geo-Fencing & Fleet Telemetry",
          desc: "Centimetre-level RTK GPS asset tracking, vehicle movement route optimization, container yard management, and unauthorized boundary alerts.",
          icon: "fa-solid fa-location-crosshairs",
          chips: ["RTK Centimetre GPS", "Geo-Fence Alerts"]
        }
      ]
    },
    "cloud-platform-services": {
      pill: "CLOUD INFRASTRUCTURE",
      title: "Cloud & Platform <strong>Capabilities</strong>",
      subtitle: "Resilient, high-availability multi-cloud architecture engineered for modern enterprise workloads and DevOps speed.",
      features: [
        {
          title: "Multi-Cloud Architecture & Migration",
          desc: "Seamless migration of legacy on-premises infrastructure to AWS, Azure, or GCP with zero data downtime and optimized cloud architecture.",
          icon: "fa-solid fa-cloud-arrow-up",
          chips: ["AWS / Azure / GCP", "Zero-Downtime Migration"]
        },
        {
          title: "DevOps & Automated CI/CD Pipelines",
          desc: "Infrastructure as Code (Terraform, Ansible), automated container orchestration (Kubernetes, Docker), and continuous deployment pipelines.",
          icon: "fa-solid fa-gears",
          chips: ["Kubernetes / Docker", "Terraform IaC"]
        },
        {
          title: "Cloud FinOps & Cost Optimization",
          desc: "Intelligent resource sizing, spot instance management, automated shutdown of idle environments, and transparent cloud spending dashboards.",
          icon: "fa-solid fa-coins",
          chips: ["FinOps Strategy", "Up to 40% Savings"]
        },
        {
          title: "High Availability & Disaster Recovery",
          desc: "Multi-region active-active deployments, automated database failover, and sub-minute Recovery Point / Time Objectives (RPO/RTO).",
          icon: "fa-solid fa-shield-heart",
          chips: ["99.99% Availability", "Sub-Minute RPO/RTO"]
        },
        {
          title: "Zero-Trust Cloud Security & Compliance",
          desc: "Identity and Access Management (IAM), end-to-end encryption in transit/at rest, DDoS mitigation, and ISO 27001 / SOC2 compliance.",
          icon: "fa-solid fa-lock",
          chips: ["Zero-Trust IAM", "ISO 27001 / SOC2"]
        },
        {
          title: "Serverless & Microservices Platform",
          desc: "Event-driven serverless architectures enabling automatic auto-scaling from zero to millions of requests with pay-per-use execution.",
          icon: "fa-solid fa-cubes",
          chips: ["Serverless Functions", "Auto-Scaling"]
        }
      ]
    },
    "drone-services": {
      pill: "AERIAL INTELLIGENCE",
      title: "Drone & Autonomous <strong>Capabilities</strong>",
      subtitle: "Survey-grade aerial intelligence, RTK precision mapping, and autonomous site surveillance fleets.",
      features: [
        {
          title: "Centimetre-Accurate Topographic Surveys",
          desc: "High-precision RTK fixed-wing and multirotor UAV surveys generating survey-grade 3D Digital Elevation Models (DEM) and contour maps.",
          icon: "fa-solid fa-map-location-dot",
          chips: ["RTK Precision", "3D Elevation Maps"]
        },
        {
          title: "Gas Pipeline Intrusion & Surveillance",
          desc: "Autonomous autopilot flight routes with AI vision detecting unauthorized digging, personnel, vehicle intrusion, and thermal gas leaks.",
          icon: "fa-solid fa-plane-up",
          chips: ["Autopilot Navigation", "AI Intrusion Alert"]
        },
        {
          title: "High-Voltage Transmission Inspection",
          desc: "Zoom lens and thermal imagery for detecting insulator damage, hot spots, structural corrosion, and wear on high-voltage assets.",
          icon: "fa-solid fa-tower-cell",
          chips: ["Thermal Hotspots", "Asset Health Logs"]
        },
        {
          title: "NDVI Precision Agriculture Mapping",
          desc: "Multispectral crop health mapping, NDVI vegetation index calculation, soil moisture assessment, and targeted spot-spraying data.",
          icon: "fa-solid fa-wheat-awn",
          chips: ["Multispectral NDVI", "Crop Health Analytics"]
        },
        {
          title: "Centralized UAV Command Center",
          desc: "Single command dashboard for live multi-drone tracking, real-time video streaming, telemetry monitoring, and automated mission logging.",
          icon: "fa-solid fa-tower-observation",
          chips: ["Central Command", "Live Video Stream"]
        },
        {
          title: "Autonomous Perimeter Patrol & Night Vision",
          desc: "Scheduled 24x7 autonomous security patrols with geo-fencing compliance, thermal IR vision, auto Return-To-Launch (RTL), and docking.",
          icon: "fa-solid fa-shield-cat",
          chips: ["24/7 Patrol", "Thermal IR Night Vision"]
        }
      ]
    }
  };

  // js/offering-detail.js
  (function() {
    "use strict";
    function resolveSlugAndBasePath() {
      const parts = window.location.pathname.split("/").filter(Boolean);
      let basePath = "/services";
      let slug = "";
      if (parts.length >= 3 && parts[0] === "pages" && parts[1] === "services") {
        slug = parts[2] || "";
      } else {
        basePath = "/" + (parts[0] || "services");
        slug = parts[1] || "";
      }
      slug = slug.replace(/\.html$/, "");
      if (slug === "software-developement") slug = "software-development";
      return { basePath, slug };
    }
    function escapeHtml(str) {
      if (str == null) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const DEFAULT_OFFERINGS = {
      "software-development": {
        title: "Software Development",
        kind: "service",
        tagline: "Where logic meets creativity, crafting digital possibilities endlessly.",
        body: "Software development is the process of creating, designing, deploying, and maintaining software applications. It involves writing, testing, and fixing code to create applications, websites, or other software products. Leveraging cutting-edge technologies, customer ideas are meticulously translated into tangible realities, forging robust IT solutions of operating power.",
        feature_list: [
          "Custom Web & Mobile Applications",
          "Microservices Architecture & API Design",
          "Enterprise Software Modernization",
          "Quality Assurance & Continuous Testing"
        ]
      },
      "enterprise-ai-solutions": {
        title: "Enterprise AI Solutions",
        kind: "service",
        tagline: "Empowering enterprise decision-making with advanced artificial intelligence.",
        body: "Enterprise AI Solutions combine deep learning, predictive analytics, and natural language processing to automate complex workflows and uncover operational insights at scale.",
        feature_list: [
          "Custom LLM Fine-Tuning & RAG Pipelines",
          "Computer Vision & Defect Detection",
          "Predictive Asset Maintenance Models",
          "Autonomous Workflow AI Agents"
        ]
      },
      "data-analytics": {
        title: "Data & Analytics",
        kind: "service",
        tagline: "Transforming raw telemetry into actionable business intelligence.",
        body: "Our Data & Analytics services help organizations consolidate disparate data streams into real-time executive dashboards and predictive analytical models.",
        feature_list: [
          "Executive & Operational Dashboards",
          "Real-Time Streaming ETL Pipelines",
          "Predictive Churn & Demand Forecasting",
          "Automated Financial Reconciliation"
        ]
      },
      "iot-driven-solutions": {
        title: "IoT Driven Solutions",
        kind: "service",
        tagline: "Connecting hardware, sensors, and cloud for real-time telemetry.",
        body: "We design and deploy end-to-end IoT architectures, connecting edge sensors over LPWAN/MQTT to centralized monitoring and auto-alerting platforms.",
        feature_list: [
          "Municipal Water & Grid Telemetry",
          "Industrial Asset Condition Monitoring",
          "Cold Chain & Environmental Sensing",
          "Edge AI & Gateway Integration"
        ]
      },
      "cloud-platform-services": {
        title: "Cloud & Platform Services",
        kind: "service",
        tagline: "Resilient, high-availability multi-cloud architecture.",
        body: "From legacy data-center exits to automated CI/CD pipelines, our Cloud Platform Services deliver secure, cost-optimized, and resilient cloud infrastructure.",
        feature_list: [
          "AWS, Azure & GCP Cloud Migration",
          "CI/CD & DevOps Automation",
          "FinOps & Cost Optimization",
          "Multi-Region Disaster Recovery"
        ]
      },
      "drone-services": {
        title: "Drone & Autonomous Services",
        kind: "service",
        tagline: "Survey-grade aerial intelligence and autonomous site surveillance.",
        body: "Leveraging RTK fixed-wing and multirotor UAV payloads for high-precision topographic mapping, infrastructure inspection, and precision agriculture.",
        feature_list: [
          "Centimeter-Accurate Topographic Surveys",
          "High-Voltage Transmission Tower Inspection",
          "NDVI Crop Health Multispectral Mapping",
          "Autonomous Perimeter Patrol Systems"
        ]
      }
    };
    function renderUseCaseTabs(slug) {
      const wrap = document.getElementById("qpaix-service-use-cases");
      if (!wrap) return;
      const data = SERVICE_USE_CASES[slug];
      if (!data || !Array.isArray(data.tabs) || data.tabs.length === 0) {
        wrap.style.display = "none";
        return;
      }
      wrap.style.display = "";
      const navBtns = data.tabs.map((tab, i) => `
      <button class="nav-link${i === 0 ? " active" : ""}" 
              id="use-case-tab-${i + 1}" 
              data-bs-toggle="tab" 
              data-bs-target="#use-case-pane-${i + 1}" 
              type="button" 
              role="tab" 
              aria-controls="use-case-pane-${i + 1}" 
              aria-selected="${i === 0 ? "true" : "false"}"
              data-cms="usecase-${slug}-tab-${i + 1}-label">
        ${escapeHtml(tab.label)}
      </button>
    `).join("");
      const panels = data.tabs.map((tab, i) => {
        let cards = tab.cards;
        if (!cards || !cards.length) {
          cards = [
            { title: "Description", text: tab.desc || (tab.points && tab.points[0] ? tab.points[0].text : ""), icon: "/images/output_oriented.png" },
            { title: tab.points && tab.points[0] ? tab.points[0].label : "Functionality", text: tab.points && tab.points[0] ? tab.points[0].text : tab.points && tab.points[1] ? tab.points[1].text : "", icon: "/images/creative_sol.png" },
            { title: tab.points && tab.points[1] ? tab.points[1].label : "Outcome", text: tab.points && tab.points[1] ? tab.points[1].text : "", icon: "/images/flexible_approach.png" }
          ];
        }
        const defaultIcons = ["fa-solid fa-file-lines", "fa-solid fa-sliders", "fa-solid fa-trophy"];
        const cardsHtml = cards.map((c, cIdx) => {
          const iconVal = c.icon || defaultIcons[cIdx % 3];
          const isFontIcon = iconVal.startsWith("fa-") || iconVal.startsWith("bx-") || iconVal.startsWith("bi-");
          const iconElement = isFontIcon ? `<i class="${escapeHtml(iconVal)}" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-icon"></i>` : `<img src="${escapeHtml(iconVal)}" alt="QPAIX" class="how_we_do_image" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-icon" />`;
          return `
          <div class="col-12 shallow-card">
            <div class="info-box">
              <div class="image_wrapper me-3 me-md-4">
                ${iconElement}
              </div>
              <div class="info-content">
                <div class="card_title" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-title">${escapeHtml(c.title)}</div>
                <div class="description" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-desc">${escapeHtml(c.text)}</div>
              </div>
            </div>
          </div>
        `;
        }).join("");
        const rightImg = tab.image || "/images/picture_101.png";
        return `
        <div class="tab-pane fade${i === 0 ? " show active" : ""}" id="use-case-pane-${i + 1}" role="tabpanel" aria-labelledby="use-case-tab-${i + 1}">
          <div class="use-case-${i + 1}">
            <div class="row justify-content-between align-items-center g-4">
              <div class="col-lg-6">
                <div class="row">
                  ${cardsHtml}
                </div>
              </div>
              <div class="col-lg-6 align-items-center d-none d-lg-flex justify-content-center">
                <div class="use-case-visual-wrapper text-center">
                  <div class="use-case-dot-pattern"></div>
                  <img src="${escapeHtml(rightImg)}" 
                       alt="${escapeHtml(tab.label)}" 
                       class="img-fluid use-case-showcase-img" 
                       data-cms="usecase-${slug}-tab-${i + 1}-image" />
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      }).join("");
      wrap.innerHTML = `
      <div class="use-cases col-12 p-0 my-4">
        <div class="row">
          <div class="col-12">
            <div class="main-title text-start mb-4">
              <span class="qpaix-section-pill mb-2" style="background: rgba(0, 229, 255, 0.12); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; display: inline-block;"><i class="fa-solid fa-layer-group me-2"></i>PROVEN SCENARIOS</span>
              <h3 class="heading-title text-white fw-bold mt-2" style="font-size: 2.2rem; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">Proven Real-World <strong>Use Cases</strong></h3>
            </div>
          </div>
        </div>
        <div class="service-use-cases-tab-container mb-lg-0 mb-4">
          <section class="py-2">
            <nav class="q-use-cases-tabs d-flex justify-content-start mb-4">
              <div class="nav nav-tabs" role="tablist">
                ${navBtns}
              </div>
            </nav>
            <div class="tab-content mt-lg-4 mt-0">
              ${panels}
            </div>
          </section>
        </div>
      </div>
    `;
      const tabBtns = wrap.querySelectorAll(".q-use-cases-tabs .nav-link");
      tabBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          tabBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const targetId = btn.getAttribute("data-bs-target");
          const panelsList = wrap.querySelectorAll(".tab-pane");
          panelsList.forEach((panel) => {
            if ("#" + panel.id === targetId) {
              panel.classList.add("show", "active");
            } else {
              panel.classList.remove("show", "active");
            }
          });
        });
      });
    }
    function renderServiceFeatures(slug) {
      const wrap = document.getElementById("qpaix-service-features");
      if (!wrap) return;
      const data = SERVICE_FEATURES[slug];
      if (!data || !Array.isArray(data.features) || data.features.length === 0) {
        return;
      }
      const pillText = data.pill || "ENGINEERING EXCELLENCE";
      const titleHtml = data.title || "Core Features & <strong>Capabilities</strong>";
      const subtitleText = data.subtitle || "Architectural standards and enterprise-grade infrastructure built directly into every deployment.";
      const cardsHtml = data.features.map((feat, i) => {
        const chip1 = feat.chips && feat.chips[0] ? feat.chips[0] : "";
        const chip2 = feat.chips && feat.chips[1] ? feat.chips[1] : "";
        return `
        <div class="col-lg-4 col-md-6 mb-4 d-flex">
          <div class="qpaix-feature-card w-100 wow fadeInUp" data-wow-delay="${0.15 + i * 0.08}s">
            <div class="feature-icon-box mb-3">
              <i class="${escapeHtml(feat.icon)}" data-cms="feature-${slug}-${i + 1}-icon"></i>
            </div>
            <h4 class="feature-title mb-2 text-start text-white" data-cms="feature-${slug}-${i + 1}-title">${escapeHtml(feat.title)}</h4>
            <p class="feature-desc text-start mb-3" data-cms="feature-${slug}-${i + 1}-desc">${escapeHtml(feat.desc)}</p>
            <div class="feature-tag-list mt-auto pt-2 d-flex flex-wrap gap-2">
              ${chip1 ? `<span class="feature-chip" data-cms="feature-${slug}-${i + 1}-chip-1">${escapeHtml(chip1)}</span>` : ""}
              ${chip2 ? `<span class="feature-chip" data-cms="feature-${slug}-${i + 1}-chip-2">${escapeHtml(chip2)}</span>` : ""}
            </div>
          </div>
        </div>
      `;
      }).join("");
      wrap.innerHTML = `
      <div class="col-12 p-0 mb-4">
        <div class="service-single-page-title text-start mb-4">
          <span class="qpaix-section-pill mb-2" data-cms="features-${slug}-pill" style="background: rgba(0, 229, 255, 0.12); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; display: inline-block;">
            <i class="fa-solid fa-layer-group me-2"></i>${escapeHtml(pillText)}
          </span>
          <h3 class="heading-title text-white fw-bold mt-2" data-cms="features-${slug}-title" style="font-size: 2.2rem; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">${titleHtml}</h3>
          <p class="qpaix-section-subtitle text-slate" data-cms="features-${slug}-subtitle" style="color: #94a3b8; font-size: 1rem; max-width: 750px;">${escapeHtml(subtitleText)}</p>
        </div>
      </div>
      ${cardsHtml}
    `;
    }
    function applyOfferingToDom(offering, slug) {
      if (!offering) return;
      const titleEl = document.getElementById("qpaix-page-title");
      if (titleEl) titleEl.textContent = `${offering.title} \u2014 QPAIX Infitech Private Limited`;
      const kindEl = document.getElementById("qpaix-offering-kind");
      if (kindEl) kindEl.textContent = offering.kind === "product" ? "PRODUCT" : "SERVICE";
      const offTitleEl = document.getElementById("qpaix-offering-title");
      if (offTitleEl) offTitleEl.textContent = offering.title;
      const taglineEl = document.getElementById("qpaix-offering-tagline");
      if (taglineEl) taglineEl.textContent = offering.tagline || "";
      const bodyEl = document.getElementById("qpaix-offering-body");
      if (bodyEl) bodyEl.innerHTML = offering.body ? `<p>${escapeHtml(offering.body)}</p>` : "";
      const features = Array.isArray(offering.feature_list) ? offering.feature_list : [];
      const featWrap = document.getElementById("qpaix-offering-features-wrap");
      const featList = document.getElementById("qpaix-offering-features");
      if (featWrap && featList) {
        if (features.length > 0) {
          featWrap.style.display = "";
          featList.innerHTML = features.map((f) => `<li class="mb-2"><i class="fa-solid fa-check me-2"></i>${escapeHtml(f)}</li>`).join("");
        } else {
          featWrap.style.display = "none";
        }
      }
      if (offering.kind === "service") {
        renderUseCaseTabs(slug);
        renderServiceFeatures(slug);
      } else {
        const useCaseWrap = document.getElementById("qpaix-service-use-cases");
        if (useCaseWrap) useCaseWrap.style.display = "none";
      }
    }
    async function init() {
      const { basePath, slug } = resolveSlugAndBasePath();
      if (!slug) return;
      const fallback = DEFAULT_OFFERINGS[slug] || {
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        kind: basePath.startsWith("/product") ? "product" : "service",
        tagline: "Engineering enterprise-grade digital systems.",
        body: "Tailored technology solutions designed for high performance, security, and scalability."
      };
      applyOfferingToDom(fallback, slug);
      try {
        const res = await fetch(`/api/v2/offerings/${encodeURIComponent(slug)}`, { credentials: "include" });
        if (res.ok) {
          const offering = await res.json();
          applyOfferingToDom(offering, slug);
        }
      } catch (e) {
        console.warn("[offering-detail] Backend fetch skipped/failed, using fallback", e);
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
})();
