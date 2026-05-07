import {
  CheckCircleOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import '../styles/landing-page.css';

import brandIcon from '../../../../icon/image.png';
import loginScreenshot from '../../../../test_images/Screenshot_2026-05-07-12-27-04-443_host.exp.expon.jpg';
import homeScreenshot from '../../../../test_images/Screenshot_2026-05-07-12-27-26-981_host.exp.expon.jpg';
import poiCreateScreenshot from '../../../../test_images/Screenshot_2026-05-07-12-27-46-407_host.exp.expon.jpg';
import mapScreenshot from '../../../../test_images/Screenshot_2026-05-07-12-27-54-993_host.exp.expon.jpg';
import verifyScreenshot from '../../../../test_images/Screenshot_2026-05-07-12-27-59-645_host.exp.expon.jpg';

const screenshots = [
  { title: '登录', image: loginScreenshot, alt: '系统登录页截图' },
  { title: '首页', image: homeScreenshot, alt: '系统首页截图' },
  { title: 'POI 新建', image: poiCreateScreenshot, alt: 'POI 新建页截图' },
  { title: '地图', image: mapScreenshot, alt: '地图页截图' },
  { title: '核验', image: verifyScreenshot, alt: '核验详情页截图' },
];

const features = [
  '支持采集者新建 POI、上传图片、自动定位与分类填写',
  '支持核验者查看详情、执行通过或驳回整改',
  '支持管理端查看全量进展、地图分布与任务协作',
  '支持 OCR 辅助识别、微信绑定与课程演示闭环',
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-brand">
          <img src={brandIcon} alt="POI 数据采集核验系统图标" className="landing-brand-mark" />
          <span>POI 数据采集核验系统</span>
        </div>

        <nav className="landing-nav" aria-label="官网导航">
          <a href="#features">功能</a>
          <a href="#scenarios">场景</a>
          <a href="#contact">联系</a>
          <a href="#notes">说明</a>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-panel">
          <div className="hero-icon-shell">
            <img src={brandIcon} alt="应用主图标" className="hero-icon" />
          </div>

          <div className="hero-copy">
            <h1>POI 数据采集核验系统</h1>
            <p>
              面向 POI 数据采集、核验、整改与地图辅助的教学演示系统，
              支持采集提交、核验处理、地图查看与流程追踪。
            </p>

            <div className="hero-tags">
              <span><SafetyCertificateOutlined /> 课程大作业 / 教学演示</span>
              <span><InfoCircleOutlined /> 当前为未上架测试版，仅用于课程演示</span>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="section-heading">
            <h2>功能截图</h2>
            <p>以下页面均来源于当前项目实际运行截图，用于说明主要业务能力与交互流程。</p>
          </div>

          <div className="shot-grid">
            {screenshots.map((shot) => (
              <article key={shot.title} className="shot-card">
                <div className="shot-card-head">{shot.title}</div>
                <img src={shot.image} alt={shot.alt} className="shot-image" />
              </article>
            ))}
          </div>
        </section>

        <section className="summary-grid">
          <article id="scenarios" className="info-card">
            <h3>使用场景</h3>
            <div className="pill-row">
              <span className="pill"><CheckCircleOutlined /> 课程大作业</span>
              <span className="pill"><CompassOutlined /> 教学演示</span>
            </div>
            <p>适用于软件架构课程项目展示、业务流程讲解与课堂演示。</p>
          </article>

          <article id="contact" className="info-card">
            <h3>联系方式</h3>
            <div className="contact-list">
              <a href="mailto:demo@poi-system.dev">
                <MailOutlined />
                <span>demo@poi-system.dev</span>
              </a>
              <a href="https://github.com/example/poi-verification-system" target="_blank" rel="noreferrer">
                <EnvironmentOutlined />
                <span>github.com/example/poi-verification-system</span>
              </a>
            </div>
          </article>

          <article id="notes" className="info-card">
            <h3>下载 / 体验说明</h3>
            <p>当前为未上架测试版，仅用于课程演示与功能展示。</p>
            <button type="button" className="ghost-button" disabled>
              暂不开放下载
            </button>
          </article>
        </section>

        <section className="landing-section capability-panel">
          <div className="section-heading">
            <h2>核心能力</h2>
            <p>围绕采集、核验、整改、地图与协作形成完整业务闭环。</p>
          </div>

          <div className="capability-list">
            {features.map((item) => (
              <div key={item} className="capability-item">
                <CheckCircleOutlined />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        © 2024 POI 数据采集核验系统 · 教学演示用途
      </footer>
    </div>
  );
}
