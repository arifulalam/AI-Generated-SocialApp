import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, doc } from '../config/firebase/firestore';

class RoleManagementService {
  constructor() {
    this.rolesRef = collection(db, 'roles');
    this.permissionsRef = collection(db, 'permissions');
    this.userRolesRef = collection(db, 'userRoles');
  }

  // Role Definitions
  async createRole(data) {
    try {
      const role = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(this.rolesRef, role);
      return docRef.id;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(roleId, updates) {
    try {
      const roleRef = doc(this.rolesRef, roleId);
      await updateDoc(roleRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(roleId) {
    try {
      // Remove role from all users first
      const userRoles = await this.getUsersWithRole(roleId);
      await Promise.all(
        userRoles.map(ur => this.removeUserRole(ur.userId, roleId))
      );
      
      // Delete the role
      await deleteDoc(doc(this.rolesRef, roleId));
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // Permission Management
  async addPermission(roleId, permission) {
    try {
      const permissionDoc = {
        roleId,
        ...permission,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(this.permissionsRef, permissionDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error adding permission:', error);
      throw error;
    }
  }

  async removePermission(permissionId) {
    try {
      await deleteDoc(doc(this.permissionsRef, permissionId));
    } catch (error) {
      console.error('Error removing permission:', error);
      throw error;
    }
  }

  async getRolePermissions(roleId) {
    try {
      const q = query(this.permissionsRef, where('roleId', '==', roleId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting role permissions:', error);
      throw error;
    }
  }

  // User Role Assignment
  async assignUserRole(userId, roleId, context) {
    try {
      const userRole = {
        userId,
        roleId,
        context, // e.g., { type: 'page', id: 'pageId' }
        assignedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(this.userRolesRef, userRole);
      return docRef.id;
    } catch (error) {
      console.error('Error assigning user role:', error);
      throw error;
    }
  }

  async removeUserRole(userId, roleId, context) {
    try {
      const q = query(
        this.userRolesRef,
        where('userId', '==', userId),
        where('roleId', '==', roleId)
      );
      
      if (context) {
        q = query(q, 
          where('context.type', '==', context.type),
          where('context.id', '==', context.id)
        );
      }
      
      const snapshot = await getDocs(q);
      await Promise.all(
        snapshot.docs.map(doc => deleteDoc(doc.ref))
      );
    } catch (error) {
      console.error('Error removing user role:', error);
      throw error;
    }
  }

  // Role Queries
  async getUserRoles(userId, contextType = null) {
    try {
      let q = query(this.userRolesRef, where('userId', '==', userId));
      
      if (contextType) {
        q = query(q, where('context.type', '==', contextType));
      }
      
      const snapshot = await getDocs(q);
      const userRoles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Get full role details
      const roles = await Promise.all(
        userRoles.map(async ur => {
          const roleDoc = await getDoc(doc(this.rolesRef, ur.roleId));
          return {
            ...ur,
            role: { id: roleDoc.id, ...roleDoc.data() }
          };
        })
      );
      
      return roles;
    } catch (error) {
      console.error('Error getting user roles:', error);
      throw error;
    }
  }

  async getUsersWithRole(roleId, contextType = null) {
    try {
      let q = query(this.userRolesRef, where('roleId', '==', roleId));
      
      if (contextType) {
        q = query(q, where('context.type', '==', contextType));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting users with role:', error);
      throw error;
    }
  }

  // Permission Checking
  async checkPermission(userId, permission, context) {
    try {
      const userRoles = await this.getUserRoles(userId);
      
      for (const userRole of userRoles) {
        // Check context match if specified
        if (context) {
          if (userRole.context.type !== context.type ||
              userRole.context.id !== context.id) {
            continue;
          }
        }
        
        // Check role permissions
        const permissions = await this.getRolePermissions(userRole.roleId);
        if (permissions.some(p => p.name === permission)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      throw error;
    }
  }

  // Predefined Roles
  async createPredefinedRoles(contextType, contextId) {
    try {
      const roles = {
        owner: {
          name: 'Owner',
          description: 'Full control over the page/group',
          permissions: ['manage_roles', 'manage_content', 'manage_members', 'manage_settings']
        },
        admin: {
          name: 'Administrator',
          description: 'Can manage content and members',
          permissions: ['manage_content', 'manage_members']
        },
        moderator: {
          name: 'Moderator',
          description: 'Can moderate content and members',
          permissions: ['moderate_content', 'moderate_members']
        },
        contributor: {
          name: 'Contributor',
          description: 'Can create and edit content',
          permissions: ['create_content', 'edit_own_content']
        },
        member: {
          name: 'Member',
          description: 'Basic member access',
          permissions: ['view_content', 'create_comments']
        }
      };

      const context = { type: contextType, id: contextId };
      
      for (const [key, roleData] of Object.entries(roles)) {
        // Create role
        const roleId = await this.createRole({
          ...roleData,
          context
        });
        
        // Add permissions
        await Promise.all(
          roleData.permissions.map(permission =>
            this.addPermission(roleId, {
              name: permission,
              context
            })
          )
        );
      }
    } catch (error) {
      console.error('Error creating predefined roles:', error);
      throw error;
    }
  }
}

export const roleManagementService = new RoleManagementService();
