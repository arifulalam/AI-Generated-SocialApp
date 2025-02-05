import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

const ReviewSystem = ({ productId, storeId, user, isStoreOwner = false }) => {
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: '',
    images: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCounts, setRatingCounts] = useState({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  });

  useEffect(() => {
    loadReviews();
    if (user) {
      loadUserReview();
    }
  }, [productId, user]);

  const loadReviews = async (loadMore = false) => {
    try {
      const reviewsRef = collection(db, 'reviews');
      let q = query(
        reviewsRef,
        where('productId', '==', productId),
        where('isApproved', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisible);
      setHasMore(snapshot.docs.length === 10);

      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (!loadMore) {
        // Calculate average rating and rating counts
        const allReviews = await getDocs(query(
          reviewsRef,
          where('productId', '==', productId),
          where('isApproved', '==', true)
        ));

        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let total = 0;

        allReviews.docs.forEach(doc => {
          const rating = doc.data().rating;
          counts[rating] = (counts[rating] || 0) + 1;
          total += rating;
        });

        setRatingCounts(counts);
        setAverageRating(total / allReviews.docs.length || 0);
      }

      setReviews(loadMore ? [...reviews, ...reviewsData] : reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserReview = async () => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef,
        where('productId', '==', productId),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setUserReview({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        });
      }
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  };

  const handleRatingChange = (rating) => {
    setNewReview(prev => ({ ...prev, rating }));
  };

  const handleCommentChange = (e) => {
    setNewReview(prev => ({ ...prev, comment: e.target.value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = [];

    try {
      for (const file of files) {
        const storageRef = ref(storage, `review-images/${productId}/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      setNewReview(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      setError('Failed to upload images');
    }
  };

  const submitReview = async () => {
    if (!user) return;

    try {
      const reviewData = {
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        productId,
        storeId,
        rating: newReview.rating,
        comment: newReview.comment,
        images: newReview.images,
        isApproved: !isStoreOwner, // Auto-approve if not store owner
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (userReview) {
        // Update existing review
        await updateDoc(doc(db, 'reviews', userReview.id), {
          ...reviewData,
          updatedAt: new Date()
        });
      } else {
        // Create new review
        await addDoc(collection(db, 'reviews'), reviewData);
      }

      // Reset form
      setNewReview({
        rating: 0,
        comment: '',
        images: []
      });

      // Reload reviews
      loadReviews();
      loadUserReview();
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review');
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(reviews.filter(review => review.id !== reviewId));
      if (userReview?.id === reviewId) {
        setUserReview(null);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      setError('Failed to delete review');
    }
  };

  const approveReview = async (reviewId) => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        isApproved: true,
        updatedAt: new Date()
      });
      loadReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      setError('Failed to approve review');
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(averageRating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600">
              {reviews.length} reviews
            </div>
          </div>

          <div className="flex-1">
            {Object.entries(ratingCounts)
              .sort((a, b) => b[0] - a[0])
              .map(([rating, count]) => (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-sm w-8">{rating} star</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded">
                    <div
                      className="h-2 bg-yellow-400 rounded"
                      style={{
                        width: `${(count / reviews.length) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm w-8">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Write Review Form */}
      {user && !isStoreOwner && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">
            {userReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingChange(star)}
                  className="focus:outline-none"
                >
                  {star <= newReview.rating ? (
                    <StarIcon className="h-8 w-8 text-yellow-400" />
                  ) : (
                    <StarOutlineIcon className="h-8 w-8 text-gray-300 hover:text-yellow-400" />
                  )}
                </button>
              ))}
            </div>

            <textarea
              value={newReview.comment}
              onChange={handleCommentChange}
              placeholder="Share your experience with this product..."
              className="w-full h-32 p-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />

            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="review-images"
              />
              <label
                htmlFor="review-images"
                className="inline-block px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                Add Photos
              </label>
              {newReview.images.length > 0 && (
                <div className="mt-2 flex space-x-2">
                  {newReview.images.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Review image ${index + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={submitReview}
              disabled={!newReview.rating || !newReview.comment}
              className="btn bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
            >
              {userReview ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={review.userAvatar || '/default-avatar.png'}
                  alt={review.userName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-medium">{review.userName}</div>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {new Date(review.createdAt.toDate()).toLocaleDateString()}
              </div>
            </div>

            <p className="mt-4">{review.comment}</p>

            {review.images?.length > 0 && (
              <div className="mt-4 flex space-x-2">
                {review.images.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Review image ${index + 1}`}
                    className="w-24 h-24 object-cover rounded"
                  />
                ))}
              </div>
            )}

            {/* Review Actions */}
            {(isStoreOwner || user?.uid === review.userId) && (
              <div className="mt-4 flex space-x-2">
                {isStoreOwner && !review.isApproved && (
                  <button
                    onClick={() => approveReview(review.id)}
                    className="btn bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve
                  </button>
                )}
                {user?.uid === review.userId && (
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="btn bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {hasMore && (
          <div className="text-center">
            <button
              onClick={() => loadReviews(true)}
              className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Load More Reviews
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSystem;
