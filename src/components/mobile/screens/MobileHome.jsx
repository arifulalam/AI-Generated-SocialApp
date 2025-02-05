import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import Carousel from 'react-native-snap-carousel';
import { LinearGradient } from 'expo-linear-gradient';
import { SharedElement } from 'react-navigation-shared-element';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MobileHome = () => {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stories, setStories] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const scrollY = useSharedValue(0);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Load data from your services
      const [products, cats, userStories, history] = await Promise.all([
        getFeaturedProducts(),
        getCategories(),
        getStories(),
        getRecentlyViewed()
      ]);

      setFeaturedProducts(products);
      setCategories(cats);
      setStories(userStories);
      setRecentlyViewed(history);
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY.value,
        [0, 100],
        [200, 100],
        'clamp'
      ),
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0.9],
        'clamp'
      ),
    };
  });

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? '#111827' : '#F3F4F6' }
    ]}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient
          colors={isDark ? ['#1F2937', '#111827'] : ['#FFFFFF', '#F3F4F6']}
          style={styles.headerGradient}
        >
          <Text style={[
            styles.headerTitle,
            { color: isDark ? '#F9FAFB' : '#111827' }
          ]}>
            Welcome Back
          </Text>
          <Text style={[
            styles.headerSubtitle,
            { color: isDark ? '#9CA3AF' : '#6B7280' }
          ]}>
            Discover what's new today
          </Text>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#F9FAFB' : '#111827'}
          />
        }
        style={styles.scrollView}
      >
        {/* Stories */}
        <View style={styles.storiesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {stories.map((story, index) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                onPress={() => navigation.navigate('Story', { storyId: story.id })}
              >
                <SharedElement id={`story.${story.id}.image`}>
                  <Image
                    source={{ uri: story.thumbnail }}
                    style={styles.storyImage}
                  />
                </SharedElement>
                <Text style={[
                  styles.storyUsername,
                  { color: isDark ? '#F9FAFB' : '#111827' }
                ]}>
                  {story.username}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Products Carousel */}
        <View style={styles.carouselContainer}>
          <Carousel
            data={featuredProducts}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
                style={styles.carouselItem}
              >
                <SharedElement id={`product.${item.id}.image`}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.carouselImage}
                  />
                </SharedElement>
                <View style={styles.carouselContent}>
                  <Text style={[
                    styles.carouselTitle,
                    { color: isDark ? '#F9FAFB' : '#111827' }
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.carouselPrice,
                    { color: isDark ? '#3B82F6' : '#2563EB' }
                  ]}>
                    ${item.price}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            sliderWidth={SCREEN_WIDTH}
            itemWidth={SCREEN_WIDTH * 0.8}
            inactiveSlideScale={0.9}
            inactiveSlideOpacity={0.7}
            autoplay
            autoplayInterval={5000}
            loop
          />
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesContainer}>
          <Text style={[
            styles.sectionTitle,
            { color: isDark ? '#F9FAFB' : '#111827' }
          ]}>
            Categories
          </Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
                ]}
                onPress={() => navigation.navigate('Category', { categoryId: category.id })}
              >
                <Image
                  source={{ uri: category.icon }}
                  style={styles.categoryIcon}
                />
                <Text style={[
                  styles.categoryName,
                  { color: isDark ? '#F9FAFB' : '#111827' }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recently Viewed */}
        <View style={styles.recentContainer}>
          <Text style={[
            styles.sectionTitle,
            { color: isDark ? '#F9FAFB' : '#111827' }
          ]}>
            Recently Viewed
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentContent}
          >
            {recentlyViewed.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.recentItem,
                  { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
                ]}
                onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
              >
                <Image
                  source={{ uri: item.image }}
                  style={styles.recentImage}
                />
                <Text style={[
                  styles.recentName,
                  { color: isDark ? '#F9FAFB' : '#111827' }
                ]}>
                  {item.name}
                </Text>
                <Text style={[
                  styles.recentPrice,
                  { color: isDark ? '#3B82F6' : '#2563EB' }
                ]}>
                  ${item.price}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 200,
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 100,
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  storiesContainer: {
    marginTop: 20,
    height: 100,
  },
  storiesContent: {
    paddingHorizontal: 15,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  storyUsername: {
    marginTop: 4,
    fontSize: 12,
  },
  carouselContainer: {
    marginTop: 20,
    height: 300,
  },
  carouselItem: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: 200,
  },
  carouselContent: {
    padding: 15,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  carouselPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoriesContainer: {
    marginTop: 30,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  categoryIcon: {
    width: 40,
    height: 40,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  recentContainer: {
    marginTop: 30,
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  recentContent: {
    paddingRight: 15,
  },
  recentItem: {
    width: 150,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  recentImage: {
    width: '100%',
    height: 150,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '500',
    padding: 10,
  },
  recentPrice: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
});

// Mock data functions
const getFeaturedProducts = async () => {
  // Implement this function to fetch featured products
  return [];
};

const getCategories = async () => {
  // Implement this function to fetch categories
  return [];
};

const getStories = async () => {
  // Implement this function to fetch stories
  return [];
};

const getRecentlyViewed = async () => {
  // Implement this function to fetch recently viewed items
  return [];
};

export default MobileHome;
