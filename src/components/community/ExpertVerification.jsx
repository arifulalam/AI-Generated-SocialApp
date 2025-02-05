import React, { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  AcademicCapIcon,
  DocumentCheckIcon,
  PhotoIcon,
  UserCircleIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

const ExpertVerification = ({ user }) => {
  const [verificationStatus, setVerificationStatus] = useState('none'); // none, pending, verified, rejected
  const [documents, setDocuments] = useState([]);
  const [expertise, setExpertise] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVerificationStatus();
  }, [user]);

  const loadVerificationStatus = async () => {
    try {
      const verificationRef = collection(db, 'expertVerifications');
      const q = query(verificationRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const verification = snapshot.docs[0].data();
        setVerificationStatus(verification.status);
        setExpertise(verification.expertise);
        setExperience(verification.experience);
        setPortfolio(verification.portfolio);
        setDocuments(verification.documents || []);
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
      setError('Failed to load verification status');
    }
  };

  const handleFileUpload = async (event) => {
    try {
      const files = Array.from(event.target.files);
      setLoading(true);
      setError(null);

      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `verifications/${user.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return {
          name: file.name,
          url,
          type: file.type
        };
      });

      const uploadedDocs = await Promise.all(uploadPromises);
      setDocuments(prev => [...prev, ...uploadedDocs]);
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!expertise || !experience || documents.length === 0) {
        setError('Please fill in all required fields and upload documents');
        return;
      }

      const verificationData = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        expertise,
        experience,
        portfolio,
        documents,
        status: 'pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'expertVerifications'), verificationData);
      setVerificationStatus('pending');
    } catch (error) {
      console.error('Error submitting verification:', error);
      setError('Failed to submit verification request');
    } finally {
      setLoading(false);
    }
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <AcademicCapIcon className="h-8 w-8 text-blue-500 mr-3" />
          <h1 className="text-2xl font-bold">Expert Verification</h1>
        </div>

        {/* Status Banner */}
        {verificationStatus !== 'none' && (
          <div className={`mb-6 p-4 rounded-lg ${
            verificationStatus === 'verified'
              ? 'bg-green-100 text-green-700'
              : verificationStatus === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            <div className="flex items-center">
              {verificationStatus === 'verified' && (
                <CheckBadgeIcon className="h-6 w-6 mr-2" />
              )}
              <span className="font-medium">
                {verificationStatus === 'verified'
                  ? 'You are a verified expert!'
                  : verificationStatus === 'pending'
                  ? 'Your verification is under review'
                  : 'Your verification was rejected'}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {verificationStatus === 'none' && (
          <form className="space-y-6">
            {/* Expertise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area of Expertise
              </label>
              <select
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select expertise</option>
                <option value="technology">Technology</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="business">Business</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Experience
              </label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Describe your professional experience..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* Portfolio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portfolio/Website (Optional)
              </label>
              <input
                type="url"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="https://your-portfolio.com"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supporting Documents
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload files</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, PDF up to 10MB each
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded Documents */}
            {documents.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Uploaded Documents
                </h3>
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <DocumentCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmitVerification}
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </form>
        )}

        {/* Verification Guidelines */}
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-medium mb-4">Verification Guidelines</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              Provide accurate and detailed information about your expertise
            </li>
            <li className="flex items-start">
              <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              Upload clear, legible copies of your certificates and credentials
            </li>
            <li className="flex items-start">
              <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              Include relevant work experience and achievements
            </li>
            <li className="flex items-start">
              <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              Verification process typically takes 2-3 business days
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExpertVerification;
