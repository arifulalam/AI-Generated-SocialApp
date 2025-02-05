import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Platform,
  RefreshControl,
  Alert
} from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { profileService } from '../../../services/ProfileService';
import { mobileService } from '../../../services/MobileService';
import {
  UserIcon,
  AcademicCapIcon,
  TrophyIcon,
  UsersIcon,
  PhoneIcon,
  CameraIcon,
  PencilIcon,
  ShieldCheckIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import Modal from 'react-native-modal';

const MobileProfile = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadProfile();
  }, [user.uid]);

  const loadProfile = async () => {
    try {
      const profileData = await profileService.getFullProfile(user.uid);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handlePhotoUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        await profileService.uploadProfilePhoto(user.uid, blob);
        await loadProfile();
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Basic Information
        </Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(true);
            setEditData(profile.basicInfo);
          }}
        >
          <PencilIcon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Full Name
        </Text>
        <Text style={[styles.value, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {profile?.basicInfo?.fullName}
        </Text>

        <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Date of Birth
        </Text>
        <Text style={[styles.value, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {profile?.basicInfo?.dateOfBirth &&
            format(new Date(profile.basicInfo.dateOfBirth), 'MMMM dd, yyyy')}
        </Text>

        <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Bio
        </Text>
        <Text style={[styles.value, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {profile?.basicInfo?.bio}
        </Text>
      </View>
    </View>
  );

  const renderEducation = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Education
        </Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(true);
            setActiveSection('education');
          }}
        >
          <PencilIcon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {profile?.education?.map((edu) => (
        <View key={edu.id} style={styles.educationItem}>
          <Text style={[styles.schoolName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {edu.schoolName}
          </Text>
          <Text style={[styles.degree, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {edu.degree}
          </Text>
          <Text style={[styles.year, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {edu.startYear} - {edu.endYear || 'Present'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Achievements
        </Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(true);
            setActiveSection('achievements');
          }}
        >
          <PencilIcon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {profile?.achievements?.map((achievement) => (
        <View key={achievement.id} style={styles.achievementItem}>
          <Text style={[styles.achievementTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {achievement.title}
          </Text>
          <Text style={[styles.achievementDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {achievement.description}
          </Text>
          <Text style={[styles.achievementDate, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {format(new Date(achievement.date), 'MMMM yyyy')}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderRelationships = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Relationships
        </Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(true);
            setActiveSection('relationships');
          }}
        >
          <PencilIcon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {profile?.relationships?.map((rel) => (
        <View key={rel.id} style={styles.relationshipItem}>
          <Image
            source={{ uri: rel.targetUser.photoURL }}
            style={styles.relationshipAvatar}
          />
          <View style={styles.relationshipInfo}>
            <Text style={[styles.relationshipName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {rel.targetUser.fullName}
            </Text>
            <Text style={[styles.relationshipType, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {rel.type}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderContacts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Contact Information
        </Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(true);
            setActiveSection('contacts');
          }}
        >
          <PencilIcon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {profile?.contacts?.map((contact) => (
        <View key={contact.id} style={styles.contactItem}>
          <Text style={[styles.contactType, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {contact.type}
          </Text>
          <Text style={[styles.contactValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {contact.value}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F3F4F6' }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#F9FAFB' : '#111827'}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: profile?.basicInfo?.photoURL }}
              style={styles.photo}
            />
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePhotoUpload}
            >
              <CameraIcon size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.name, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {profile?.basicInfo?.fullName}
          </Text>
          
          {profile?.basicInfo?.isVerified && (
            <View style={styles.verifiedBadge}>
              <ShieldCheckIcon size={16} color="#3B82F6" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'basic' && styles.activeTab
            ]}
            onPress={() => setActiveSection('basic')}
          >
            <UserIcon
              size={24}
              color={activeSection === 'basic' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'education' && styles.activeTab
            ]}
            onPress={() => setActiveSection('education')}
          >
            <AcademicCapIcon
              size={24}
              color={activeSection === 'education' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'achievements' && styles.activeTab
            ]}
            onPress={() => setActiveSection('achievements')}
          >
            <TrophyIcon
              size={24}
              color={activeSection === 'achievements' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'relationships' && styles.activeTab
            ]}
            onPress={() => setActiveSection('relationships')}
          >
            <UsersIcon
              size={24}
              color={activeSection === 'relationships' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'contacts' && styles.activeTab
            ]}
            onPress={() => setActiveSection('contacts')}
          >
            <PhoneIcon
              size={24}
              color={activeSection === 'contacts' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>

        {/* Content Sections */}
        {activeSection === 'basic' && renderBasicInfo()}
        {activeSection === 'education' && renderEducation()}
        {activeSection === 'achievements' && renderAchievements()}
        {activeSection === 'relationships' && renderRelationships()}
        {activeSection === 'contacts' && renderContacts()}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        isVisible={isEditing}
        onBackdropPress={() => setIsEditing(false)}
        style={styles.modal}
      >
        <View style={[
          styles.modalContent,
          { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
        ]}>
          <Text style={[
            styles.modalTitle,
            { color: isDark ? '#F9FAFB' : '#111827' }
          ]}>
            Edit {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          </Text>
          {/* Add form fields based on activeSection */}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    marginLeft: 4,
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    padding: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    marginBottom: 16,
  },
  educationItem: {
    marginBottom: 16,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  degree: {
    fontSize: 14,
    marginBottom: 2,
  },
  year: {
    fontSize: 14,
  },
  achievementItem: {
    marginBottom: 16,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 14,
  },
  relationshipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  relationshipAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  relationshipInfo: {
    flex: 1,
  },
  relationshipName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  relationshipType: {
    fontSize: 14,
  },
  contactItem: {
    marginBottom: 12,
  },
  contactType: {
    fontSize: 14,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
});

export default MobileProfile;
