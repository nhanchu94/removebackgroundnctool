"use client";

import { useState, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useJobQueue } from '../../context/JobQueueContext';
import { JobType, Page } from '../../types';
import { useApiKeys } from '../../context/ApiKeyContext';
import { fileToBase64 } from '../../util/fileUtils';
import JobProgress from '../../components/JobProgress';

export default function RemoveBackgroundPage() {
  const [files, setFiles] = useState<File[]>([]);
  const { addJobs, jobs } = useJobQueue();
  const { isPhotoRoomKeySet } = useApiKeys();
  const [isLoading, setIsLoading] = useState(false);

  const removeBgJobs = jobs.filter(job => job.type === JobType.REMOVE_BACKGROUND);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    try {
        const jobsToCreate = await Promise.all(files.map(async file => {
            const imageData = await fileToBase64(file);
            return {
                type: JobType.REMOVE_BACKGROUND,
                payload: {
                    imageData,
                    originalFilename: file.name
                }
            };
        }));
        
        if (jobsToCreate.length > 0) {
            addJobs(jobsToCreate);
            // Chuyển hướng sang trang queue nếu cần
            // router.push('/queue');
        }
    } catch(error) {
        console.error("Error creating remove background jobs:", error);
    } finally {
        setIsLoading(false);
    }
  }, [files, addJobs]);

  const isProcessDisabled = files.length === 0 || !isPhotoRoomKeySet || isLoading;

  // Kiểm tra xem đang chạy ở localhost hay đã deploy
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Remove Background</h2>
          <p className="text-gray-400">Tách nền tự động bằng API PhotoRoom chuyên nghiệp.</p>

          {isLocal ? (
            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-md">
                <h4 className="text-blue-400 font-semibold mb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Ghi chú cho Local Development
                </h4>
                <p className="text-sm text-gray-400">
                Khi chạy ở Local, lỗi CORS sẽ xảy ra. Bạn nên cài extension Chrome <a href="https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafcejaoocghogpeppocadhjbldbd" target="_blank" className="text-blue-400 underline font-medium">"Allow CORS"</a> để test ngay.
                </p>
                <p className="text-xs text-blue-300 mt-2 italic">
                * Sau khi Deploy lên Vercel, hệ thống sẽ tự động sửa lỗi CORS qua Serverless Proxy.
                </p>
            </div>
          ) : (
            <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-md">
                <h4 className="text-green-400 font-semibold mb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                CORS Auto-Fix Active
                </h4>
                <p className="text-sm text-gray-400">
                Ứng dụng đang chạy trên Vercel. Mọi yêu cầu tới PhotoRoom đều được xử lý qua Proxy bảo mật, lỗi CORS đã được loại bỏ.
                </p>
            </div>
          )}

          <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {files.length > 0 && (
              <div className="text-sm text-gray-300">
                  Đã chọn {files.length} ảnh: {files.map(f => f.name).join(', ')}
              </div>
          )}
          
          <div className="flex items-center justify-end space-x-4">
              {!isPhotoRoomKeySet && <p className="text-yellow-400 text-sm">Cần nhập PhotoRoom API key trong Settings.</p>}
              <Button onClick={handleProcess} disabled={isProcessDisabled} isLoading={isLoading}>
                  Bắt đầu tách nền
              </Button>
          </div>
        </div>
      </Card>
      <JobProgress title="Tiến độ tách nền" jobs={removeBgJobs} />
    </div>
  );
}
