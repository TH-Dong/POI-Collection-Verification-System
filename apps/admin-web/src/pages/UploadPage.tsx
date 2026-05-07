import { UploadOutlined } from '@ant-design/icons';
import { Button, Typography, Upload, message } from 'antd';
import { RcFile } from 'antd/es/upload';
import { useState } from 'react';
import { uploadFile, type UploadResult } from '../api/file';

export default function UploadPage() {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCustomUpload = async ({ file }: { file: RcFile }) => {
    try {
      setUploading(true);
      setResult(null);
      const uploadResult = await uploadFile(file);
      setResult(uploadResult);
      message.success('文件上传完毕');
    } catch (error) {
      message.error('文件上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="section-block">
         <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
           实验室：附件传输探针
         </Typography.Title>
         <Typography.Paragraph style={{ marginTop: 'var(--space-8)', margin: 0, color: 'var(--color-text-muted)' }}>
           针对当前对象存储策略的直接端点测试。
         </Typography.Paragraph>
      </div>

      <div style={{ border: '1px solid var(--color-border)', padding: 'var(--space-24)', backgroundColor: 'var(--color-bg-subtle)' }}>
        <Upload
          showUploadList={false}
          customRequest={({ file }) => void handleCustomUpload({ file: file as RcFile })}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />} loading={uploading} style={{ fontWeight: 600 }}>
            发起传输请求
          </Button>
        </Upload>
      </div>

      {result && (
        <div style={{ marginTop: 'var(--space-24)', border: '1px solid var(--color-primary)', padding: 'var(--space-24)', backgroundColor: 'var(--color-bg-base)' }}>
           <Typography.Title level={5} style={{ marginTop: 0, color: 'var(--color-primary)', fontWeight: 700 }}>
             [ 成功 ] 对象已被代理服务器接管
           </Typography.Title>
           <Typography.Paragraph style={{ fontFamily: 'monospace', color: 'var(--color-text-base)', margin: 0, marginTop: 'var(--space-16)' }}>
             <span style={{ display: 'inline-block', width: 120, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>源代号 (FILE)</span> {result.originalFilename}<br />
             <span style={{ display: 'inline-block', width: 120, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>对象池指针 (ID)</span> {result.objectName}<br />
             <span style={{ display: 'inline-block', width: 120, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>物理体积 (BYTES)</span> {result.size}<br />
             <span style={{ display: 'inline-block', width: 120, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>落盘策略 (MODE)</span> {result.storageMode}<br />
             <span style={{ display: 'inline-block', width: 120, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>访问端点 (URL)</span> <a href={result.url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{result.url}</a>
           </Typography.Paragraph>
        </div>
      )}
    </div>
  );
}
