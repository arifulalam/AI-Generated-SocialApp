import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import {
  ChatBubbleLeftRightIcon,
  HandThumbUpIcon,
  UserCircleIcon,
  CheckBadgeIcon,
  TagIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const QandA = ({ user, productId }) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([
    'Product', 'Shipping', 'Payment', 'Usage', 'Technical', 'Other'
  ]);
  const [filter, setFilter] = useState('recent'); // recent, popular, unanswered
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, [productId, filter]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const questionsRef = collection(db, 'questions');
      let q = query(
        questionsRef,
        where('productId', '==', productId)
      );

      // Apply filters
      switch (filter) {
        case 'popular':
          q = query(q, orderBy('votes', 'desc'));
          break;
        case 'unanswered':
          q = query(q, where('answersCount', '==', 0));
          break;
        default:
          q = query(q, orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const questionsList = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const question = { id: doc.id, ...doc.data() };
          
          // Get answers
          const answersRef = collection(db, 'answers');
          const answersQuery = query(
            answersRef,
            where('questionId', '==', doc.id),
            orderBy('votes', 'desc')
          );
          const answersSnapshot = await getDocs(answersQuery);
          
          question.answers = answersSnapshot.docs.map(answerDoc => ({
            id: answerDoc.id,
            ...answerDoc.data()
          }));
          
          return question;
        })
      );

      setQuestions(questionsList);
    } catch (error) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!newQuestion.trim()) {
        setError('Please enter your question');
        return;
      }

      const questionData = {
        productId,
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        content: newQuestion,
        tags: selectedTags,
        votes: 0,
        answersCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'questions'), questionData);
      setNewQuestion('');
      setSelectedTags([]);
      await loadQuestions();
    } catch (error) {
      console.error('Error asking question:', error);
      setError('Failed to post question');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (questionId, answer) => {
    try {
      setLoading(true);
      setError(null);

      const answerData = {
        questionId,
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        content: answer,
        votes: 0,
        isAccepted: false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'answers'), answerData);
      
      // Update question's answer count
      await updateDoc(doc(db, 'questions', questionId), {
        answersCount: increment(1),
        updatedAt: serverTimestamp()
      });

      await loadQuestions();
    } catch (error) {
      console.error('Error posting answer:', error);
      setError('Failed to post answer');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (type, id, value) => {
    try {
      const docRef = doc(db, type, id);
      await updateDoc(docRef, {
        votes: increment(value)
      });
      await loadQuestions();
    } catch (error) {
      console.error('Error voting:', error);
      setError('Failed to vote');
    }
  };

  const handleAcceptAnswer = async (questionId, answerId) => {
    try {
      // Update previous accepted answer if exists
      const answersRef = collection(db, 'answers');
      const q = query(
        answersRef,
        where('questionId', '==', questionId),
        where('isAccepted', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'answers', snapshot.docs[0].id), {
          isAccepted: false
        });
      }

      // Accept new answer
      await updateDoc(doc(db, 'answers', answerId), {
        isAccepted: true
      });

      await loadQuestions();
    } catch (error) {
      console.error('Error accepting answer:', error);
      setError('Failed to accept answer');
    }
  };

  const renderMarkdown = (content) => {
    const html = marked(content);
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Ask Question Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-lg font-medium">Ask a Question</h2>
        </div>

        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="What would you like to know?"
          className="w-full p-3 border rounded-lg mb-4"
          rows={4}
        />

        {/* Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev =>
                  prev.includes(tag)
                    ? prev.filter(t => t !== tag)
                    : [...prev, tag]
                )}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAskQuestion}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Question'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('recent')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'recent'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setFilter('popular')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'popular'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Popular
          </button>
          <button
            onClick={() => setFilter('unanswered')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'unanswered'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Unanswered
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map(question => (
          <div key={question.id} className="bg-white rounded-lg shadow p-6">
            {/* Question */}
            <div className="flex items-start space-x-4">
              {/* Voting */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleVote('questions', question.id, 1)}
                  className="text-gray-500 hover:text-blue-500"
                >
                  <ArrowUpIcon className="h-6 w-6" />
                </button>
                <span className="text-lg font-medium my-1">{question.votes}</span>
                <button
                  onClick={() => handleVote('questions', question.id, -1)}
                  className="text-gray-500 hover:text-blue-500"
                >
                  <ArrowDownIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1">
                {/* Question Header */}
                <div className="flex items-center mb-2">
                  <img
                    src={question.userAvatar || '/default-avatar.png'}
                    alt={question.userName}
                    className="h-8 w-8 rounded-full mr-2"
                  />
                  <div>
                    <span className="font-medium">{question.userName}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {new Date(question.createdAt?.toDate()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Question Content */}
                <div
                  className="prose max-w-none mb-4"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(question.content)
                  }}
                />

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {question.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Answers */}
                <div className="mt-6 space-y-4">
                  {question.answers.map(answer => (
                    <div
                      key={answer.id}
                      className={`pl-8 pb-4 border-l-2 ${
                        answer.isAccepted
                          ? 'border-green-500'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Answer Voting */}
                        <div className="flex flex-col items-center">
                          <button
                            onClick={() => handleVote('answers', answer.id, 1)}
                            className="text-gray-500 hover:text-blue-500"
                          >
                            <ArrowUpIcon className="h-5 w-5" />
                          </button>
                          <span className="text-sm font-medium my-1">
                            {answer.votes}
                          </span>
                          <button
                            onClick={() => handleVote('answers', answer.id, -1)}
                            className="text-gray-500 hover:text-blue-500"
                          >
                            <ArrowDownIcon className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="flex-1">
                          {/* Answer Header */}
                          <div className="flex items-center mb-2">
                            <img
                              src={answer.userAvatar || '/default-avatar.png'}
                              alt={answer.userName}
                              className="h-6 w-6 rounded-full mr-2"
                            />
                            <span className="font-medium">{answer.userName}</span>
                            <span className="text-gray-500 text-sm ml-2">
                              {new Date(answer.createdAt?.toDate()).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Answer Content */}
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(answer.content)
                            }}
                          />

                          {/* Accept Answer Button */}
                          {question.userId === user.uid && !answer.isAccepted && (
                            <button
                              onClick={() => handleAcceptAnswer(question.id, answer.id)}
                              className="mt-2 text-green-500 hover:text-green-600 text-sm flex items-center"
                            >
                              <CheckBadgeIcon className="h-5 w-5 mr-1" />
                              Accept Answer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Answer */}
                <div className="mt-6">
                  <textarea
                    placeholder="Write your answer..."
                    className="w-full p-3 border rounded-lg mb-2"
                    rows={3}
                  />
                  <button
                    onClick={(e) => {
                      const answer = e.target.previousSibling.value;
                      if (answer.trim()) {
                        handleAnswerQuestion(question.id, answer);
                        e.target.previousSibling.value = '';
                      }
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Post Answer
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QandA;
