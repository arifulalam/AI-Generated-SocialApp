import { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapPinIcon, CalendarIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';

const BloodDonationPost = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: '',
    location: '',
    dateTime: '',
    issue: '',
    bagsNeeded: 1,
    contactNumber: '',
    note: '',
    hospital: '',
    urgency: 'normal' // normal, urgent, emergency
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        ...formData,
        type: 'blood_donation',
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        status: 'active',
        donors: [],
        shares: 0
      };

      await addDoc(collection(db, 'posts'), postData);
      onClose();
    } catch (error) {
      console.error('Error creating blood donation post:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
        <h3 className="text-red-600 font-semibold text-lg mb-2">Blood Donation Request</h3>
        <p className="text-red-500 text-sm">This post will be highlighted to nearby donors</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient Name</label>
          <div className="mt-1 relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              required
              className="input pl-10"
              placeholder="Patient's full name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Blood Group</label>
          <select
            name="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="">Select Blood Group</option>
            {bloodGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Hospital/Location</label>
          <div className="mt-1 relative">
            <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="hospital"
              value={formData.hospital}
              onChange={handleChange}
              required
              className="input pl-10"
              placeholder="Hospital name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location Details</label>
          <div className="mt-1 relative">
            <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="input pl-10"
              placeholder="Detailed address"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Required Date & Time</label>
          <div className="mt-1 relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="datetime-local"
              name="dateTime"
              value={formData.dateTime}
              onChange={handleChange}
              required
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Number</label>
          <div className="mt-1 relative">
            <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              className="input pl-10"
              placeholder="Emergency contact number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bags Needed</label>
          <input
            type="number"
            name="bagsNeeded"
            value={formData.bagsNeeded}
            onChange={handleChange}
            required
            min="1"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Urgency Level</label>
          <select
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Patient's Condition/Issue</label>
        <textarea
          name="issue"
          value={formData.issue}
          onChange={handleChange}
          required
          className="input h-20"
          placeholder="Describe the patient's condition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Additional Note</label>
        <textarea
          name="note"
          value={formData.note}
          onChange={handleChange}
          className="input h-20"
          placeholder="Any additional information for donors"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn bg-red-600 hover:bg-red-700 text-white"
        >
          Post Blood Request
        </button>
      </div>
    </form>
  );
};

export default BloodDonationPost;
