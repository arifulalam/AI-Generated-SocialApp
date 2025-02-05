import React, { useState, useEffect } from 'react';
import { roleManagementService } from '../../services/RoleManagementService';
import { Dialog } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline';

const RoleManagementDashboard = ({ contextType, contextId }) => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isAssigningUser, setIsAssigningUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, [contextType, contextId]);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const rolesData = await roleManagementService.getRoles(contextType, contextId);
      setRoles(rolesData);

      // Load users for each role
      const usersData = await Promise.all(
        rolesData.map(role => roleManagementService.getUsersWithRole(role.id))
      );
      
      setUsers(usersData.flat());
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async (roleData) => {
    try {
      await roleManagementService.createRole({
        ...roleData,
        context: { type: contextType, id: contextId }
      });
      await loadRoles();
      setIsAddingRole(false);
    } catch (error) {
      console.error('Error adding role:', error);
    }
  };

  const handleEditRole = async (roleId, updates) => {
    try {
      await roleManagementService.updateRole(roleId, updates);
      await loadRoles();
      setIsEditingRole(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await roleManagementService.deleteRole(roleId);
      await loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleAssignUser = async (userId, roleId) => {
    try {
      await roleManagementService.assignUserRole(userId, roleId, {
        type: contextType,
        id: contextId
      });
      await loadRoles();
      setIsAssigningUser(false);
    } catch (error) {
      console.error('Error assigning user role:', error);
    }
  };

  const handleRemoveUser = async (userId, roleId) => {
    try {
      await roleManagementService.removeUserRole(userId, roleId, {
        type: contextType,
        id: contextId
      });
      await loadRoles();
    } catch (error) {
      console.error('Error removing user role:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Role Management
        </h1>
        <button
          onClick={() => setIsAddingRole(true)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg
            hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Role
        </button>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            users={users.filter(u => u.roleId === role.id)}
            onEdit={() => {
              setSelectedRole(role);
              setIsEditingRole(true);
            }}
            onDelete={() => handleDeleteRole(role.id)}
            onAssignUser={() => {
              setSelectedRole(role);
              setIsAssigningUser(true);
            }}
            onRemoveUser={(userId) => handleRemoveUser(userId, role.id)}
          />
        ))}
      </div>

      {/* Add Role Dialog */}
      <AddRoleDialog
        isOpen={isAddingRole}
        onClose={() => setIsAddingRole(false)}
        onAdd={handleAddRole}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        isOpen={isEditingRole}
        role={selectedRole}
        onClose={() => {
          setIsEditingRole(false);
          setSelectedRole(null);
        }}
        onEdit={handleEditRole}
      />

      {/* Assign User Dialog */}
      <AssignUserDialog
        isOpen={isAssigningUser}
        role={selectedRole}
        onClose={() => {
          setIsAssigningUser(false);
          setSelectedRole(null);
        }}
        onAssign={handleAssignUser}
      />
    </div>
  );
};

const RoleCard = ({ role, users, onEdit, onDelete, onAssignUser, onRemoveUser }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {role.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {role.description}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-500 dark:hover:text-red-300"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Permissions */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Permissions
        </h4>
        <div className="flex flex-wrap gap-2">
          {role.permissions.map((permission) => (
            <span
              key={permission}
              className="px-2 py-1 text-xs font-medium rounded-full
                bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {permission}
            </span>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Users ({users.length})
          </h4>
          <button
            onClick={onAssignUser}
            className="p-1 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <UserPlusIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex justify-between items-center p-2 rounded-lg
                bg-gray-50 dark:bg-gray-700"
            >
              <div className="flex items-center space-x-2">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {user.name}
                </span>
              </div>
              <button
                onClick={() => onRemoveUser(user.id)}
                className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <UserMinusIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AddRoleDialog = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({ name: '', description: '', permissions: [] });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Add New Role
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600
                  dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500
                  focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600
                  dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500
                  focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Permissions
              </label>
              <div className="mt-2 space-y-2">
                {['manage_content', 'manage_users', 'view_analytics'].map((permission) => (
                  <label key={permission} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission)}
                      onChange={(e) => {
                        const newPermissions = e.target.checked
                          ? [...formData.permissions, permission]
                          : formData.permissions.filter(p => p !== permission);
                        setFormData({ ...formData, permissions: newPermissions });
                      }}
                      className="rounded border-gray-300 dark:border-gray-600
                        text-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {permission}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                  hover:text-gray-500 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500
                  rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2
                  focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Role
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

const EditRoleDialog = ({ isOpen, role, onClose, onEdit }) => {
  const [formData, setFormData] = useState(role || {});

  useEffect(() => {
    setFormData(role || {});
  }, [role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onEdit(role.id, formData);
  };

  if (!role) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Edit Role
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Similar form fields as AddRoleDialog */}
            {/* ... */}
          </form>
        </div>
      </div>
    </Dialog>
  );
};

const AssignUserDialog = ({ isOpen, role, onClose, onAssign }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (searchQuery) {
      // Implement user search
    }
  }, [searchQuery]);

  if (!role) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Assign Users to {role.name}
          </Dialog.Title>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600
                dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500
                focus:ring-blue-500"
            />

            <div className="max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50
                    dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => onAssign(user.id, role.id)}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <UserPlusIcon className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                  hover:text-gray-500 dark:hover:text-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default RoleManagementDashboard;
