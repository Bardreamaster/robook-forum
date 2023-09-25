import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  CommonActions,
} from '@react-navigation/native';
import { useFormContext } from 'react-hook-form';

import mock from '../__mocks__/mockData';
import {
  Author,
  CustomHeader,
  HeaderItem,
  LocalRepliedPost,
  Markdown,
  ModalHeader,
  PostGroupings,
} from '../components';
import { CustomImage, Divider, IconWithLabel, Text } from '../core-ui';
import {
  errorHandlerAlert,
  getPostShortUrl,
  sortImageUrl,
  useStorage,
  generateMarkdownContent,
} from '../helpers';
import {
  useEditPost,
  useEditTopic,
  useLookupUrls,
  useNewTopic,
  useReplyTopic,
} from '../hooks';
import { makeStyles, useTheme } from '../theme';
import { RootStackNavProp, RootStackRouteProp, StackRouteProp } from '../types';
import { useModal } from '../utils';

const ios = Platform.OS === 'ios';

export default function PostPreview() {
  const { setModal } = useModal();
  const styles = useStyles();
  const { colors } = useTheme();

  const navigation = useNavigation<RootStackNavProp<'PostPreview'>>();

  const { reset, goBack, dispatch } = navigation;

  const {
    params: {
      reply,
      postData,
      focusedPostNumber,
      editPostId,
      editTopicId,
      editedUser,
    },
  } = useRoute<RootStackRouteProp<'PostPreview'>>();

  const storage = useStorage();
  const channels = storage.getItem('channels');

  const { reset: resetForm } = useFormContext();

  const [imageUrls, setImageUrls] = useState<Array<string>>();

  const { title, content } = postData;
  const shortUrls = getPostShortUrl(content) ?? [];
  const tags = 'tagIds' in postData ? postData.tagIds : [];
  const images = 'images' in postData ? postData.images : undefined;

  const navToPostDetail = ({
    topicId,
    focusedPostNumber,
  }: StackRouteProp<'PostDetail'>['params']) => {
    const prevScreen = 'PostPreview';

    /**
     * This action is used to remove the 'post preview,' 'post reply,' 'newPost,' and 'post detail' screens from the routes list.
     * Then, we add a new route for 'Post Detail' and reset all routes into the new routes, depending on whether we want to go back to the home or notifications screen after 'Post Detail'
     * For Detail implementation see https://reactnavigation.org/docs/navigation-prop/#dispatch
     */

    dispatch((state) => {
      let newRoutesFilter = state.routes.filter(
        ({ name }) =>
          name !== 'NewPost' &&
          name !== 'PostPreview' &&
          name !== 'PostReply' &&
          name !== 'PostDetail',
      );

      const routesMap = [
        ...newRoutesFilter,
        {
          name: 'PostDetail',
          params: { topicId, focusedPostNumber, prevScreen },
          key: 'post-detail',
        },
      ];

      return CommonActions.reset({
        ...state,
        routes: routesMap,
        index: routesMap.length - 1,
      });
    });
  };

  const { getImageUrls } = useLookupUrls({
    variables: { shortUrls },
    onCompleted: ({ lookupUrls }) => {
      setImageUrls(sortImageUrl(shortUrls, lookupUrls));
    },
  });

  const { newTopic, loading: newTopicLoading } = useNewTopic({
    onCompleted: ({ newTopic: result }) => {
      resetForm();

      reset({
        index: 1,
        routes: [
          { name: 'TabNav', state: { routes: [{ name: 'Home' }] } },
          {
            name: 'PostDetail',
            params: { topicId: result.topicId, focusedPostNumber },
          },
        ],
      });
    },
  });

  const { reply: replyTopic, loading: replyLoading } = useReplyTopic({
    onCompleted: ({ reply: { postNumber } }) => {
      navToPostDetail({
        topicId: ('topicId' in postData && postData.topicId) || 0,
        focusedPostNumber: postNumber,
      });
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
  });

  const { editPost, loading: editPostLoading } = useEditPost({
    onCompleted: () => {
      resetForm();
      !editTopicId && // if there's also editTopicId then don't do anything.
        navToPostDetail({
          topicId: ('topicId' in postData && postData.topicId) || 0,
          focusedPostNumber,
        });
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
  });

  const { editTopic, loading: editTopicLoading } = useEditTopic({
    onCompleted: () => {
      resetForm();
      navToPostDetail({
        topicId: editTopicId || 0,
        focusedPostNumber,
      });
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
  });

  const loading = reply
    ? replyLoading || editPostLoading
    : newTopicLoading || editTopicLoading;

  useEffect(() => {
    if (shortUrls.length > 0) {
      getImageUrls();
    }
  }, [getImageUrls, shortUrls.length]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (loading) {
          e.preventDefault();
        }
      }),
    [loading, navigation],
  );

  const postToServer = () => {
    setModal(false);
    if (editPostId || editTopicId) {
      if (editPostId) {
        editPost({
          variables: {
            postId: editPostId,
            postInput: {
              raw: content,
            },
          },
        });
      }
      if (editTopicId) {
        editTopic({
          variables: {
            topicId: editTopicId,
            topicInput: {
              title,
              categoryId: ('channelId' in postData && postData.channelId) || 0,
              tags,
            },
          },
        });
      }
      return;
    }
    if (reply) {
      const postNumber = 'postNumber' in postData ? postData.postNumber : null;
      replyTopic({
        variables: {
          content,
          topicId: ('topicId' in postData && postData.topicId) || 0,
          replyToPostNumber: postNumber,
        },
      });
    } else {
      newTopic({
        variables: {
          newTopicInput: {
            title,
            category: ('channelId' in postData && postData.channelId) || 0,
            tags,
            raw: content,
          },
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title={t('Preview')}
        rightIcon="Send"
        onPressRight={postToServer}
        isLoading={loading}
      />
      {ios && (
        <ModalHeader
          title={t('Preview')}
          left={
            <HeaderItem
              label={t('Cancel')}
              onPressItem={goBack}
              disabled={loading}
              left
            />
          }
          right={
            <HeaderItem
              label={t('Post')}
              onPressItem={postToServer}
              loading={loading}
            />
          }
        />
      )}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {reply ? (
          <>
            <IconWithLabel
              icon="Replies"
              color={colors.textLighter}
              label={title}
              fontStyle={styles.title}
              style={styles.titleContainer}
              numberOfLines={1}
            />
            <Divider style={styles.spacingBottom} horizontalSpacing="xxl" />
          </>
        ) : (
          <Text style={styles.spacingBottom} variant="semiBold" size="l">
            {title}
          </Text>
        )}
        <Author
          image={
            editedUser
              ? editedUser.avatar
              : storage.getItem('user')?.avatar || ''
          }
          title={
            editedUser
              ? editedUser.username
              : storage.getItem('user')?.username || ''
          }
          size="s"
          style={styles.spacingBottom}
        />

        {!reply && 'channelId' in postData && (
          <PostGroupings
            style={styles.spacingBottom}
            channel={
              channels?.find(({ id }) => id === postData.channelId) ||
              mock.channels[0]
            }
            tags={tags}
          />
        )}
        {reply && 'replyToPostId' in postData && postData.replyToPostId && (
          <LocalRepliedPost replyToPostId={postData.replyToPostId} />
        )}

        <Markdown
          style={styles.markdown}
          content={generateMarkdownContent(content, imageUrls)}
          nonClickable={true}
        />

        {/* NOTE: Earlier, this file contained the functionality to show default image if imageUrl is empty and short url length is not 0.

          It was removed because we already handle invalid url to use default image inside customImage.
          If we later want to check the old implementation we can check it in PR: https://github.com/kodefox/lexicon/pull/987>
         */}

        {!reply &&
          images?.map((image, index) => (
            <CustomImage
              src={image}
              style={styles.spacingBottom}
              key={`images-${index}`}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, fontVariants, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: ios ? spacing.xl : spacing.xxl,
  },
  titleContainer: {
    flex: 1,
    paddingTop: spacing.m,
    paddingBottom: spacing.xl,
  },
  title: {
    flex: 1,
    ...fontVariants.semiBold,
  },
  markdown: {
    marginTop: spacing.xl,
  },
  spacingBottom: {
    marginBottom: spacing.xl,
  },
}));
