"use client";

import { useState, useEffect } from 'react';
import { useApiKeys } from '../../context/ApiKeyContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';

export default function Page() {
  const { apiKeys, saveApiKeys } = useApiKeys();
  const [localKeys, setLocalKeys] = useState(apiKeys);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const handleSave = () => {
    saveApiKeys(localKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">API Keys & Connectivity</h2>
            <p className="text-gray-400">
                Các API key của bạn được lưu an toàn trong trình duyệt (Local Storage).
            </p>
            <Textarea
                label="Gemini API Keys (mỗi key một dòng)"
                id="gemini-key"
                placeholder="Nhập Gemini API keys..."
                value={localKeys.gemini}
                onChange={(e) => setLocalKeys({ ...localKeys, gemini: e.target.value })}
            />
            <div className="max-w-md">
                <Input
                    label="PhotoRoom API Key"
                    id="photoroom-key"
                    type="password"
                    placeholder="Nhập PhotoRoom API key"
                    value={localKeys.photoRoom}
                    onChange={(e) => setLocalKeys({ ...localKeys, photoRoom: e.target.value })}
                />
            </div>
            <div className="flex items-center space-x-4 pt-2">
                <Button onClick={handleSave}>
                    Lưu cấu hình
                </Button>
                {saved && <span className="text-green-400">Đã lưu thành công!</span>}
            </div>
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold text-white">Hướng dẫn xử lý lỗi CORS</h2>
        <div className="mt-4 space-y-4 text-gray-400 text-sm">
            <p>
                Trình duyệt thường chặn các yêu cầu trực tiếp tới API bên thứ ba vì lý do bảo mật (CORS). Để khắc phục:
            </p>
            <ol className="list-decimal list-inside space-y-2">
                <li>
                    <span className="font-semibold text-gray-300">Deploy lên Vercel:</span> Ứng dụng đã tích hợp sẵn Serverless Proxy. Khi bạn deploy lên Vercel, lỗi này sẽ tự động được xử lý mà không cần cài đặt gì thêm.
                </li>
                <li>
                    <span className="font-semibold text-gray-300">Chạy tại Local:</span> Nếu bạn đang dev tại localhost, hãy cài extension Chrome <a href="https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafcejaoocghogpeppocadhjbldbd" target="_blank" className="text-blue-400 underline">"Allow CORS"</a> và bật nó lên khi sử dụng tính năng tách nền.
                </li>
            </ol>
        </div>
      </Card>
    </div>
  );
}
